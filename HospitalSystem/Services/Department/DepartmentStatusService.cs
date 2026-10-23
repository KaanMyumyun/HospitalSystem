using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Department;
using HospitalSystem.Services.Appointments;

namespace HospitalSystem.Services.Department;

public class DepartmentStatusService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog) : IDepartmentStatusService
{
    public async Task<DepartmentActionResultDto> ChangeDepartmentStatusAsync(ChangeDepartmentStatusDto dto)
    {
        if (currentUser.RequireAdmin<DepartmentActionResultDto>("change department status") is { } refusal)
            return refusal;

        if (dto.IsActive is not bool isActive)
            return DepartmentActionResultDto.Fail("Department status is required");

        var department = await context.Departments.FirstOrDefaultAsync(d => d.Id == dto.DepartmentId);
        if (department == null)
            return DepartmentActionResultDto.NotFound("Department not found");

        if (department.IsActive && !isActive)
        {
            var stranded = await AffectedBookings.LoadFutureAsync(context, a => a.Doctor.DepartmentId == department.Id);
            var bookingRefusal = await AffectedBookings.ResolveAsync<DepartmentActionResultDto>(
                stranded, dto, auditLog, $"department {department.Department} deactivated");
            if (bookingRefusal is not null)
                return bookingRefusal;
        }

        department.IsActive = isActive;
        await auditLog.LogAsync(
            "ChangeDepartmentStatus",
            "Department",
            department.Id,
            $"Department {department.Department} set to {(isActive ? "active" : "inactive")}");
        await context.SaveChangesAsync();

        return DepartmentActionResultDto.Success();
    }
}
