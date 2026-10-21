using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Department;
using HospitalSystem.Services.Appointments;
 
namespace HospitalSystem.Services.Deparment;
 
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
            return DepartmentActionResultDto.Forbidden("You are not allowed to change department status");
 
        var department = await _context.Departments.FirstOrDefaultAsync(d => d.Id == dto.DepartmentId);
        if (department == null)
            return DepartmentActionResultDto.NotFound("Department doesnt exist");

        if (department.IsActive && !dto.IsActive)
        {
            var stranded = await AffectedBookings.LoadFutureAsync(_context, a => a.Doctor.DepartmentId == department.Id);
            var refusal = await AffectedBookings.ResolveAsync<DepartmentActionResultDto>(
                stranded, dto, _auditLog, $"department {department.Department} deactivated");
            if (refusal is not null)
                return refusal;
        }
 
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
