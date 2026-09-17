using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Department;
 
namespace HospitalSystem.Services.Deparment;
 
public class DepartmentCreationService : IDepartmentCreationService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public DepartmentCreationService(ApplicationDbContext context, ICurrentUserService currentUser, IAuditLogService auditLog)
    {
        _context = context;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    public async Task<DepartmentActionResultDto> CreateDepartmentAsync(CreateDepartmentDto dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return DepartmentActionResultDto.Fail("You are not allowed to create a department");

        var exists = await _context.Departments.AnyAsync(d => d.Department == dto.Name);
        if (exists)
            return DepartmentActionResultDto.Fail("Department already exists");

        // Saved twice because the audit row needs the new id; one transaction
        // keeps the two saves all-or-nothing.
        await using var transaction = await _context.Database.BeginTransactionAsync();

        var department = new DepartmentEntity { Department = dto.Name, IsActive = true };
        _context.Departments.Add(department);
        await _context.SaveChangesAsync();

        await _auditLog.LogAsync("CreateDepartment", "Department", department.Id, $"Created department {department.Department}");
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return DepartmentActionResultDto.Success();
    }
}
