using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Appointments;

namespace HospitalSystem.Services.Appointments;
 
public class AppointmentCancellationService : IAppointmentCancellationService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;
 
    public AppointmentCancellationService(
        ApplicationDbContext context,
        ICurrentUserService currentUser,
        IAuditLogService auditLog)
    {
        _context = context;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }
 
    public async Task<CancelAppointmentResultDto> CancelAppointmentAsync(CancelAppointmentDto dto)
    {
        // Deliberately no ownership check: any front-desk user may cancel any
        // appointment, not just ones they created. Front-desk staff commonly
        // share duties and the original booker may not be on shift when a
        // cancellation is needed. See list.txt B8.
        if (!_currentUser.IsInRole(UserRole.FrontDesk))
            return CancelAppointmentResultDto.Fail("You are not allowed to cancel appointments");
 
        if (string.IsNullOrWhiteSpace(dto.Reason))
            return CancelAppointmentResultDto.Fail("Cancellation reason is required");
 
        var appointment = await _context.Appointments
            .SingleOrDefaultAsync(a => a.Id == dto.AppointmentId);
 
        if (appointment == null)
            return CancelAppointmentResultDto.Fail("Appointment not found");
 
        if (appointment.Status == AppointmentStatus.Cancelled)
            return CancelAppointmentResultDto.Fail("Appointment already canceled");
 
        appointment.Status = AppointmentStatus.Cancelled;
        appointment.CancellationReason = dto.Reason;
        appointment.CancelledAt = DateTime.UtcNow;
        await _auditLog.LogAsync(
            "CancelAppointment",
            "Appointment",
            appointment.Id,
            $"Cancelled appointment {appointment.Id}. Reason: {dto.Reason}");
 
        await _context.SaveChangesAsync();
 
        return CancelAppointmentResultDto.Success();
    }
}
