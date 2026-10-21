using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Appointments;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Appointments;

// Records how an appointment went: completed, or the patient did not come.
// The desk can mark any appointment, a doctor only their own.
public class AppointmentStatusService : IAppointmentStatusService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public AppointmentStatusService(ApplicationDbContext context, ICurrentUserService currentUser, IAuditLogService auditLog)
    {
        _context = context;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    public async Task<AppointmentStatusResultDto> ChangeStatusAsync(ChangeAppointmentStatusDto dto)
    {
        var isDesk = _currentUser.IsInRole(UserRole.FrontDesk);
        if (!isDesk && !_currentUser.IsInRole(UserRole.Doctor))
            return AppointmentStatusResultDto.Forbidden("You are not allowed to change an appointment's status");

        if (dto.AppointmentId is not int appointmentId || dto.Status is not AppointmentStatus status)
            return AppointmentStatusResultDto.Fail("Appointment id and status are required");

        if (status is not (AppointmentStatus.Completed or AppointmentStatus.NoShow))
            return AppointmentStatusResultDto.Fail("An appointment can only be marked completed or no-show");

        var appointment = await _context.Appointments
            .Include(a => a.Doctor)
            .SingleOrDefaultAsync(a => a.Id == appointmentId);
        if (appointment == null)
            return AppointmentStatusResultDto.NotFound("Appointment not found");

        if (!isDesk && appointment.Doctor.UserId.ToString() != _currentUser.UserId)
            return AppointmentStatusResultDto.Forbidden("Doctors can only mark their own appointments");

        if (appointment.Status == AppointmentStatus.Cancelled)
            return AppointmentStatusResultDto.Fail("A cancelled appointment cannot be marked");

        if (appointment.TimeOfAppointment > DateTime.UtcNow)
            return AppointmentStatusResultDto.Fail("An appointment can only be marked once it has started");

        if (appointment.Status == status)
            return AppointmentStatusResultDto.Fail($"The appointment is already marked {Describe(status)}");

        var previous = appointment.Status;
        appointment.Status = status;
        await _auditLog.LogAsync(
            "ChangeAppointmentStatus",
            "Appointment",
            appointment.Id,
            $"Appointment {appointment.Id} marked {Describe(status)} (was {Describe(previous)})");
        await _context.SaveChangesAsync();

        return AppointmentStatusResultDto.Success();
    }

    private static string Describe(AppointmentStatus status) => status switch
    {
        AppointmentStatus.NoShow => "no-show",
        _ => status.ToString().ToLowerInvariant()
    };
}
