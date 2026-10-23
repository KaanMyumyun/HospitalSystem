using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Appointments;

namespace HospitalSystem.Services.Appointments;

public class AppointmentQueryService(
    ApplicationDbContext context,
    ICurrentUserService currentUser) : IAppointmentQueryService
{
    // Six weeks covers a month view and keeps one response small.
    private static readonly TimeSpan MaxWindow = TimeSpan.FromDays(42);

    public async Task<ServiceResult<List<ViewAppointmentDto>>> GetAppointmentsAsync(AppointmentQueryDto query)
    {
        if (!currentUser.IsDesk() && !currentUser.IsInRole(UserRole.DemoFrontDesk))
            return ServiceResult<List<ViewAppointmentDto>>.Forbidden("Not allowed to list appointments");

        if (query.DoctorId is not int doctorId || query.From is not DateTimeOffset from || query.To is not DateTimeOffset to)
            return ServiceResult<List<ViewAppointmentDto>>.Fail("Doctor id, from and to are required");

        var windowError = CheckWindow(from, to);
        if (windowError is not null)
            return ServiceResult<List<ViewAppointmentDto>>.Fail(windowError);

        return ServiceResult<List<ViewAppointmentDto>>.Success(
            await ListAsync(a => a.DoctorId == doctorId, from, to));
    }

    // A doctor sees only their own appointments.
    public async Task<ServiceResult<List<ViewAppointmentDto>>> GetMyAppointmentsAsync(MyAppointmentsQueryDto query)
    {
        if (!currentUser.IsInRole(UserRole.Doctor) || !int.TryParse(currentUser.UserId, out var userId))
            return ServiceResult<List<ViewAppointmentDto>>.Forbidden("Only doctors have their own appointments");

        if (query.From is not DateTimeOffset from || query.To is not DateTimeOffset to)
            return ServiceResult<List<ViewAppointmentDto>>.Fail("From and to are required");

        var windowError = CheckWindow(from, to);
        if (windowError is not null)
            return ServiceResult<List<ViewAppointmentDto>>.Fail(windowError);

        return ServiceResult<List<ViewAppointmentDto>>.Success(
            await ListAsync(a => a.Doctor.UserId == userId, from, to));
    }

    private static string? CheckWindow(DateTimeOffset from, DateTimeOffset to)
    {
        if (to <= from)
            return "To must be after from";

        if (to - from > MaxWindow)
            return "The time window can be at most 42 days";

        return null;
    }

    // Appointments in every status that start at or after from and before to,
    // in time order.
    private Task<List<ViewAppointmentDto>> ListAsync(
        Expression<Func<AppointmentEntity, bool>> whose,
        DateTimeOffset from,
        DateTimeOffset to)
    {
        var fromUtc = from.UtcDateTime;
        var toUtc = to.UtcDateTime;

        return context.Appointments
            .AsNoTracking()
            .Where(whose)
            .Where(a => a.TimeOfAppointment >= fromUtc && a.TimeOfAppointment < toUtc)
            .OrderBy(a => a.TimeOfAppointment)
            .ThenBy(a => a.Id)
            .Select(a => new ViewAppointmentDto
            {
                AppointmentId = a.Id,
                DoctorId = a.DoctorId,
                DoctorName = a.Doctor.User.Name,
                PatientId = a.PatientId,
                PatientName = a.Patient.Name,
                PatientPhoneNumber = a.Patient.PhoneNumber,
                AppointmentTime = a.TimeOfAppointment,
                Status = a.Status
            })
            .ToListAsync();
    }
}
