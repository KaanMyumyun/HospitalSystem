using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interface;
using HospitalSystem.Interface.Department;
 
namespace HospitalSystem.Services;
 
public class DepartmentStatusService : IDepartmentStatusService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;
 
    public DepartmentStatusService(ApplicationDbContext context, ICurrentUserService currentUser, IAuditLogService auditLog)
    {
        _context = context;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }
 
    public async Task<DepartmentActionResultDto> ChangeDepartmentStatusAsync(ChangeDepartmentStatusDto dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return DepartmentActionResultDto.Fail("You are not allowed to change department status");
 
        var department = await _context.Departments.FirstOrDefaultAsync(d => d.Id == dto.DepartmentId);
        if (department == null)
            return DepartmentActionResultDto.Fail("Department doesnt exist");
 
        department.IsActive = dto.IsActive;
        await _auditLog.LogAsync(
            "ChangeDepartmentStatus",
            "Department",
            department.Id,
            $"Department {department.Department} set to {(dto.IsActive ? "active" : "inactive")}");
        await _context.SaveChangesAsync();
 
        return DepartmentActionResultDto.Success();
    }
}
