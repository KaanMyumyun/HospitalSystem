using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interface;
using HospitalSystem.Interfaces.Appointments;

namespace HospitalSystem.Services.Appointments;
 
public class AppointmentCancellationService : IAppointmentCancellationService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
 
    public AppointmentCancellationService(ApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }
 
    public async Task<CancelAppointmentResultDto> CancelAppointmentAsync(CancelAppointmentDto dto)
    {
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
 
        await _context.SaveChangesAsync();
 
        return CancelAppointmentResultDto.Success();
    }
}
