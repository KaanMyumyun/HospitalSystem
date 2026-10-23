using System.Linq.Expressions;
using HospitalSystem.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Appointments;

// The future bookings a schedule, status or role change would strand. The
// change is refused with them listed; sent again with a reason, it cancels
// them the way the desk cancels a booking, in the caller's save.
internal static class AffectedBookings
{
    // The refusal lists the soonest this many; its count covers them all.
    public const int MaxListed = 100;

    // Scheduled bookings that have not started yet, soonest first, with the
    // patient and doctor needed to describe them.
    public static Task<List<AppointmentEntity>> LoadFutureAsync(
        ApplicationDbContext context,
        Expression<Func<AppointmentEntity, bool>> filter)
    {
        var now = DateTime.UtcNow;
        return context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor).ThenInclude(d => d.User)
            .Where(a => a.Status == AppointmentStatus.Scheduled && a.TimeOfAppointment > now)
            .Where(filter)
            .OrderBy(a => a.TimeOfAppointment)
            .ThenBy(a => a.Id)
            .ToListAsync();
    }

    // Null when the change can go ahead: nothing is stranded, or the request
    // asked to cancel what is and gave a reason. Otherwise the refusal.
    public static async Task<TResult?> ResolveAsync<TResult>(
        IReadOnlyList<AppointmentEntity> stranded,
        ICancelsAffectedBookings request,
        IAuditLogService auditLog,
        string change)
        where TResult : BookingChangeResult<TResult>, new()
    {
        if (stranded.Count == 0)
            return null;

        if (!request.CancelAffectedAppointments)
            return BookingChangeResult<TResult>.AffectsBookings(
                stranded.Count,
                stranded.Take(MaxListed).Select(Describe).ToList());

        var reason = request.CancellationReason?.Trim();
        if (string.IsNullOrEmpty(reason))
            return BookingChangeResult<TResult>.Fail("A reason is required to cancel the affected bookings");

        if (reason.Length > 500)
            return BookingChangeResult<TResult>.Fail("The cancellation reason must be 500 characters or fewer");

        var now = DateTime.UtcNow;
        foreach (var appointment in stranded)
        {
            appointment.Status = AppointmentStatus.Cancelled;
            appointment.CancellationReason = reason;
            appointment.CancelledAt = now;
            await auditLog.LogAsync(
                "CancelAppointment",
                "Appointment",
                appointment.Id,
                $"Cancelled appointment {appointment.Id} ({change}). Reason: {reason}");
        }

        return null;
    }

    private static AffectedAppointmentDto Describe(AppointmentEntity appointment) => new()
    {
        AppointmentId = appointment.Id,
        AppointmentTime = appointment.TimeOfAppointment,
        DoctorName = appointment.Doctor.User.Name,
        PatientInitials = Initials(appointment.Patient.Name)
    };

    // "Maria Ivanova" is "MI", as on the reception grid.
    private static string Initials(string name) =>
        string.Concat(name.Split(' ', StringSplitOptions.RemoveEmptyEntries).Take(2).Select(part => char.ToUpperInvariant(part[0])));
}
