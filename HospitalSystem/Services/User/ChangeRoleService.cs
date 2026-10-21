using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.User;
using HospitalSystem.Services.Appointments;
using HospitalSystem.Services.Auth;
 
namespace HospitalSystem.Services.User;
 
public class ChangeRoleService : IChangeRoleService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;
    private readonly SecurityStampCache _stamps;
 
    public ChangeRoleService(ApplicationDbContext context, ICurrentUserService currentUser, IAuditLogService auditLog, SecurityStampCache stamps)
    {
        _context = context;
        _currentUser = currentUser;
        _auditLog = auditLog;
        _stamps = stamps;
    }
 
    public async Task<ChangeRoleResultDto> ChangeRoleAsync(ChangeRoleDto dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return ChangeRoleResultDto.Forbidden("Not allowed");
 
        // With the doctor row, if the user has one: one query instead of two.
        var user = await _context.Users
            .Include(u => u.Doctor)
            .FirstOrDefaultAsync(u => u.Id == dto.UserId);
        if (user == null)
            return ChangeRoleResultDto.NotFound("User not found");
 
        var oldRole = user.Role;
        var roleError = await RoleChange.ApplyAsync(_context, _currentUser, user, dto.NewRole);
        if (roleError is not null)
            return ChangeRoleResultDto.Fail(roleError);

        var doctor = user.Doctor;

        // Taking the role away deactivates the doctor below.
        if (dto.NewRole != UserRole.Doctor && doctor is { IsActive: true })
        {
            var stranded = await AffectedBookings.LoadFutureAsync(_context, a => a.DoctorId == doctor.Id);
            var refusal = await AffectedBookings.ResolveAsync<ChangeRoleResultDto>(
                stranded, dto, _auditLog, $"user {user.Name} is no longer a doctor");
            if (refusal is not null)
                return refusal;
        }
 
        if (dto.NewRole == UserRole.Doctor)
        {
            if (doctor == null)
            {
                _context.Doctors.Add(new DoctorEntity
                {
                    UserId = user.Id,
                    IsActive = false,
                    DepartmentId = 1
                });
            }
            else
            {
                doctor.IsActive = true;
            }
        }
        else
        {
            if (doctor != null)
                doctor.IsActive = false;
        }
 
        await _auditLog.LogAsync(
            "ChangeUserRole",
            "User",
            user.Id,
            $"User {user.Name} role changed from {oldRole} to {dto.NewRole}");
        await _context.SaveChangesAsync();
        _stamps.Forget(user.Id);
        return ChangeRoleResultDto.Success();
    }
}
