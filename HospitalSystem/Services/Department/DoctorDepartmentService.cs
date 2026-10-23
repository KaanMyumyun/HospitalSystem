using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Department;

namespace HospitalSystem.Services.Department;

public class DoctorDepartmentService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog) : IDoctorDepartmentService
{
    public async Task<DepartmentActionResultDto> ChangeDoctorDepartmentAsync(ChangeDoctorDepartmentDto dto)
    {
        if (currentUser.RequireAdmin<DepartmentActionResultDto>("change a doctor's department") is { } refusal)
            return refusal;

        // The department's state comes with the doctor: one query instead of two.
        var found = await context.Doctors
            .Where(d => d.Id == dto.DoctorId)
            .Select(d => new
            {
                Doctor = d,
                DepartmentIsActive = context.Departments
                    .Where(x => x.Id == dto.DepartmentId)
                    .Select(x => (bool?)x.IsActive)
                    .FirstOrDefault()
            })
            .FirstOrDefaultAsync();
        if (found == null)
            return DepartmentActionResultDto.NotFound("Doctor not found");

        var doctor = found.Doctor;
        if (!doctor.IsActive)
            return DepartmentActionResultDto.Fail("This doctor is not active");

        if (found.DepartmentIsActive is not bool departmentIsActive)
            return DepartmentActionResultDto.NotFound("Department not found");

        if (!departmentIsActive)
            return DepartmentActionResultDto.Fail("This department is not active");

        if (doctor.DepartmentId == dto.DepartmentId)
            return DepartmentActionResultDto.Fail("Already in that department");

        var oldDepartmentId = doctor.DepartmentId;
        doctor.DepartmentId = dto.DepartmentId;
        await auditLog.LogAsync(
            "ChangeDoctorDepartment",
            "Doctor",
            doctor.Id,
            $"Doctor {doctor.Id} moved from department {oldDepartmentId} to {dto.DepartmentId}");
        await context.SaveChangesAsync();

        return DepartmentActionResultDto.Success();
    }
}
