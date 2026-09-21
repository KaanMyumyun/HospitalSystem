using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.User;
 
namespace HospitalSystem.Services.User;
 
public class DoctorStatusService : IDoctorStatusService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;
 
    public DoctorStatusService(ApplicationDbContext context, ICurrentUserService currentUser, IAuditLogService auditLog)
    {
        _context = context;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }
 
    public async Task<ChangeDoctorsStatusResult> ChangeDoctorsStatusAsync(ChangeDoctorStatusDto dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return ChangeDoctorsStatusResult.Fail("You are not allowed to change doctor status");

        if (dto.DoctorId is not int doctorId || dto.IsActive is not bool isActive)
            return ChangeDoctorsStatusResult.Fail("Doctor id and status are required");
 
        var doctor = await _context.Doctors
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == doctorId);
 
        if (doctor == null)
            return ChangeDoctorsStatusResult.Fail("Doctor doesnt exist");
 
        if (doctor.IsActive == isActive)
            return ChangeDoctorsStatusResult.Fail("Doctor already has this status");

        if (isActive && doctor.User.Role != UserRole.Doctor)
            return ChangeDoctorsStatusResult.Fail("Only users with the Doctor role can be activated");
 
        doctor.IsActive = isActive;
        if (!isActive)
            doctor.User.SecurityStamp = Guid.NewGuid().ToString();
        await _auditLog.LogAsync(
            "ChangeDoctorStatus",
            "Doctor",
            doctor.Id,
            $"Doctor {doctor.User.Name} set to {(isActive ? "active" : "inactive")}");
        await _context.SaveChangesAsync();
 
        return ChangeDoctorsStatusResult.Success(new ChangeDoctorsStatus
        {
            DoctorId = doctor.Id,
            UserId = doctor.UserId,
            UserName = doctor.User.Name,
            IsActive = doctor.IsActive
        });
    }
}
