using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interface;
using HospitalSystem.Interface.User;
 
namespace HospitalSystem.Services;
 
public class ChangeRoleService : IChangeRoleService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;
 
    public ChangeRoleService(ApplicationDbContext context, ICurrentUserService currentUser, IAuditLogService auditLog)
    {
        _context = context;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }
 
    public async Task<ChangeRoleResultDto> ChangeRoleAsync(ChangeRoleDto dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return ChangeRoleResultDto.Fail("Not allowed");
 
        var user = await _context.Users.FindAsync(dto.UserId);
        if (user == null)
            return ChangeRoleResultDto.Fail("User not found");
 
        if (!Enum.IsDefined(typeof(UserRole), dto.NewRole) || dto.NewRole == UserRole.Pending)
            return ChangeRoleResultDto.Fail("Invalid role");
 
        if (user.Role == dto.NewRole)
            return ChangeRoleResultDto.Fail("User already has this role");
 
        var oldRole = user.Role;
        user.Role = dto.NewRole;
 
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == user.Id);
 
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
        return ChangeRoleResultDto.Success();
    }
}
