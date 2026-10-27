using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Appointments;

namespace HospitalSystem.Services.Appointments;

public class AppointmentCancellationService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog) : IAppointmentCancellationService
{
    public async Task<CancelAppointmentResultDto> CancelAppointmentAsync(
        CancelAppointmentDto dto, CancellationToken cancellationToken = default)
    {
        if (!currentUser.IsDesk())
            return CancelAppointmentResultDto.Forbidden("You are not allowed to cancel appointments");

        if (string.IsNullOrWhiteSpace(dto.Reason))
            return CancelAppointmentResultDto.Fail("Cancellation reason is required");

        var appointment = await context.Appointments
            .SingleOrDefaultAsync(a => a.Id == dto.AppointmentId, cancellationToken);

        if (appointment == null)
            return CancelAppointmentResultDto.NotFound("Appointment not found");

        if (appointment.Status == AppointmentStatus.Cancelled)
            return CancelAppointmentResultDto.Fail("Appointment already canceled");

        if (appointment.Status != AppointmentStatus.Scheduled)
            return CancelAppointmentResultDto.Fail("Only scheduled appointments can be cancelled");

        if (appointment.TimeOfAppointment <= DateTime.UtcNow)
            return CancelAppointmentResultDto.Fail("Past appointments cannot be cancelled");

        appointment.Status = AppointmentStatus.Cancelled;
        appointment.CancellationReason = dto.Reason;
        appointment.CancelledAt = DateTime.UtcNow;
        await auditLog.LogAsync(
            "CancelAppointment",
            "Appointment",
            appointment.Id,
            $"Cancelled appointment {appointment.Id}. Reason: {dto.Reason}",
            cancellationToken);

        await context.SaveChangesAsync(cancellationToken);

        return CancelAppointmentResultDto.Success();
    }
}
