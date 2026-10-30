using System.Linq.Expressions;
using HospitalSystem.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Appointments;

internal static class AffectedBookings
{
    public const int MaxListed = 100;

    public sealed record Booking(int Id, DateTime TimeOfAppointment);

    public static Task<List<Booking>> LoadFutureAsync(
        ApplicationDbContext context,
        Expression<Func<AppointmentEntity, bool>> filter,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        return context.Appointments
            .Where(a => a.Status == AppointmentStatus.Scheduled && a.TimeOfAppointment > now)
            .Where(filter)
            .OrderBy(a => a.TimeOfAppointment)
            .ThenBy(a => a.Id)
            .Select(a => new Booking(a.Id, a.TimeOfAppointment))
            .ToListAsync(cancellationToken);
    }

    public static async Task<TResult?> ResolveAsync<TResult>(
        ApplicationDbContext context,
        IReadOnlyList<Booking> stranded,
        ICancelsAffectedBookings request,
        IAuditLogService auditLog,
        string change,
        CancellationToken cancellationToken = default)
        where TResult : BookingChangeResult<TResult>, new()
    {
        if (stranded.Count == 0)
            return null;

        if (!request.CancelAffectedAppointments)
            return BookingChangeResult<TResult>.AffectsBookings(
                stranded.Count,
                await DescribeAsync(context, stranded.Take(MaxListed).Select(b => b.Id).ToList(), cancellationToken));

        var reason = request.CancellationReason?.Trim();
        if (string.IsNullOrEmpty(reason))
            return BookingChangeResult<TResult>.Fail("A reason is required to cancel the affected bookings");

        if (reason.Length > 500)
            return BookingChangeResult<TResult>.Fail("The cancellation reason must be 500 characters or fewer");

        var ids = stranded.Select(b => b.Id).ToList();
        var appointments = await context.Appointments
            .Where(a => ids.Contains(a.Id) && a.Status == AppointmentStatus.Scheduled)
            .OrderBy(a => a.TimeOfAppointment)
            .ThenBy(a => a.Id)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var appointment in appointments)
        {
            appointment.Status = AppointmentStatus.Cancelled;
            appointment.CancellationReason = reason;
            appointment.CancelledAt = now;
            await auditLog.LogAsync(
                "CancelAppointment",
                "Appointment",
                appointment.Id,
                $"Cancelled appointment {appointment.Id} ({change}). Reason: {reason}",
                cancellationToken);
        }

        return null;
    }

    private static async Task<List<AffectedAppointmentDto>> DescribeAsync(
        ApplicationDbContext context, List<int> ids, CancellationToken cancellationToken)
    {
        var listed = await context.Appointments
            .Where(a => ids.Contains(a.Id))
            .OrderBy(a => a.TimeOfAppointment)
            .ThenBy(a => a.Id)
            .Select(a => new { a.Id, a.TimeOfAppointment, DoctorName = a.Doctor.User.Name, PatientName = a.Patient.Name })
            .ToListAsync(cancellationToken);

        return listed.Select(a => new AffectedAppointmentDto
        {
            AppointmentId = a.Id,
            AppointmentTime = a.TimeOfAppointment,
            DoctorName = a.DoctorName,
            PatientInitials = Initials(a.PatientName)
        }).ToList();
    }

    private static string Initials(string name) =>
        string.Concat(name.Split(' ', StringSplitOptions.RemoveEmptyEntries).Take(2).Select(part => char.ToUpperInvariant(part[0])));
}
