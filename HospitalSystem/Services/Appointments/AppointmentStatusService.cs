using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Appointments;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Appointments;

public class AppointmentStatusService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog) : IAppointmentStatusService
{
    public async Task<AppointmentStatusResultDto> ChangeStatusAsync(
        ChangeAppointmentStatusDto dto, CancellationToken cancellationToken = default)
    {
        if (!currentUser.Allows(Access.DeskOrDoctor))
            return AppointmentStatusResultDto.Forbidden("You are not allowed to change an appointment's status");

        if (dto.Status is not AppointmentStatus status)
            return AppointmentStatusResultDto.Fail("Status is required");

        if (status is not (AppointmentStatus.Completed or AppointmentStatus.NoShow))
            return AppointmentStatusResultDto.Fail("An appointment can only be marked completed or no-show");

        var appointment = await context.Appointments
            .Include(a => a.Doctor)
            .SingleOrDefaultAsync(a => a.Id == dto.AppointmentId, cancellationToken);
        if (appointment == null)
            return AppointmentStatusResultDto.NotFound("Appointment not found");

        if (!currentUser.IsDesk() && appointment.Doctor.UserId.ToString() != currentUser.UserId)
            return AppointmentStatusResultDto.Forbidden("Doctors can only mark their own appointments");

        if (appointment.Status == AppointmentStatus.Cancelled)
            return AppointmentStatusResultDto.Fail("A cancelled appointment cannot be marked");

        if (appointment.TimeOfAppointment > DateTime.UtcNow)
            return AppointmentStatusResultDto.Fail("An appointment can only be marked once it has started");

        if (appointment.Status == status)
            return AppointmentStatusResultDto.Fail($"The appointment is already marked {Describe(status)}");

        var previous = appointment.Status;
        appointment.Status = status;
        await auditLog.LogAsync(
            "ChangeAppointmentStatus",
            "Appointment",
            appointment.Id,
            $"Appointment {appointment.Id} marked {Describe(status)} (was {Describe(previous)})",
            cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        return AppointmentStatusResultDto.Success();
    }

    private static string Describe(AppointmentStatus status) => status switch
    {
        AppointmentStatus.NoShow => "no-show",
        _ => status.ToString().ToLowerInvariant()
    };
}
