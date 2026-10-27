using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Department;

namespace HospitalSystem.Services.Department;

public class DepartmentCreationService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog) : IDepartmentCreationService
{
    public async Task<DepartmentActionResultDto> CreateDepartmentAsync(
        CreateDepartmentDto dto, CancellationToken cancellationToken = default)
    {
        if (currentUser.RequireAdmin<DepartmentActionResultDto>("create a department") is { } refusal)
            return refusal;

        var name = dto.Name.Trim();
        if (name.Length == 0)
            return DepartmentActionResultDto.Fail("Department name is required");

        // Names ignore case, like usernames: "Cardiology" and "cardiology" are
        // the same department. IX_Departments_LowerDepartment backs this up.
        var nameKey = name.ToLowerInvariant();
        if (await context.Departments.AnyAsync(d => d.Name.ToLower() == nameKey, cancellationToken))
            return DepartmentActionResultDto.Conflict("Department already exists");

        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

        var department = new DepartmentEntity { Name = name, IsActive = true };
        context.Departments.Add(department);
        await context.SaveChangesAsync(cancellationToken);

        await auditLog.LogAsync(
            "CreateDepartment",
            "Department",
            department.Id,
            $"Created department {department.Name}",
            cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return DepartmentActionResultDto.Success();
    }
}
