using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Department;

namespace HospitalSystem.Services.Department;

public class DepartmentCreationService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog) : IDepartmentCreationService
{
    public async Task<DepartmentActionResultDto> CreateDepartmentAsync(CreateDepartmentDto dto)
    {
        if (currentUser.RequireAdmin<DepartmentActionResultDto>("create a department") is { } refusal)
            return refusal;

        var name = dto.Name.Trim();
        if (name.Length == 0)
            return DepartmentActionResultDto.Fail("Department name is required");

        // Names ignore case, like usernames: "Cardiology" and "cardiology" are
        // the same department. IX_Departments_LowerDepartment backs this up.
        var nameKey = name.ToLowerInvariant();
        if (await context.Departments.AnyAsync(d => d.Department.ToLower() == nameKey))
            return DepartmentActionResultDto.Conflict("Department already exists");

        await using var transaction = await context.Database.BeginTransactionAsync();

        var department = new DepartmentEntity { Department = name, IsActive = true };
        context.Departments.Add(department);
        await context.SaveChangesAsync();

        await auditLog.LogAsync("CreateDepartment", "Department", department.Id, $"Created department {department.Department}");
        await context.SaveChangesAsync();
        await transaction.CommitAsync();

        return DepartmentActionResultDto.Success();
    }
}
