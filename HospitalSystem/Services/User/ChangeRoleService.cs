using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.User;
using HospitalSystem.Services.Appointments;
using HospitalSystem.Services.Auth;

namespace HospitalSystem.Services.User;

public class ChangeRoleService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog,
    SecurityStampCache stamps) : IChangeRoleService
{
    public async Task<ChangeRoleResultDto> ChangeRoleAsync(ChangeRoleDto dto)
    {
        if (currentUser.RequireAdmin<ChangeRoleResultDto>("change a user's role") is { } refusal)
            return refusal;

        // With the doctor row, if the user has one: one query instead of two.
        var user = await context.Users
            .Include(u => u.Doctor)
            .FirstOrDefaultAsync(u => u.Id == dto.UserId);
        if (user == null)
            return ChangeRoleResultDto.NotFound("User not found");

        var doctor = user.Doctor;

        // A new doctor needs a department; a former doctor goes back to theirs
        // unless another one is given.
        if (dto.NewRole == UserRole.Doctor)
        {
            if (dto.DepartmentId is int departmentId)
            {
                var departmentIsActive = await context.Departments
                    .Where(d => d.Id == departmentId)
                    .Select(d => (bool?)d.IsActive)
                    .FirstOrDefaultAsync();
                if (departmentIsActive is null)
                    return ChangeRoleResultDto.NotFound("Department not found");
                if (departmentIsActive == false)
                    return ChangeRoleResultDto.Fail("This department is not active");
            }
            else if (doctor == null)
            {
                return ChangeRoleResultDto.Fail("Choose a department for the new doctor");
            }
        }

        var oldRole = user.Role;
        var roleError = await RoleChange.ApplyAsync(context, currentUser, user, dto.NewRole);
        if (roleError is not null)
            return ChangeRoleResultDto.Fail(roleError);

        // Taking the role away deactivates the doctor below.
        if (dto.NewRole != UserRole.Doctor && doctor is { IsActive: true })
        {
            var stranded = await AffectedBookings.LoadFutureAsync(context, a => a.DoctorId == doctor.Id);
            var bookingRefusal = await AffectedBookings.ResolveAsync<ChangeRoleResultDto>(
                stranded, dto, auditLog, $"user {user.Name} is no longer a doctor");
            if (bookingRefusal is not null)
                return bookingRefusal;
        }

        if (dto.NewRole == UserRole.Doctor)
        {
            if (doctor == null)
            {
                doctor = new DoctorEntity { UserId = user.Id, DepartmentId = dto.DepartmentId!.Value };
                context.Doctors.Add(doctor);
            }
            else if (dto.DepartmentId is int departmentId)
            {
                doctor.DepartmentId = departmentId;
            }
            doctor.IsActive = true;
        }
        else if (doctor != null)
        {
            doctor.IsActive = false;
        }

        var department = dto.NewRole == UserRole.Doctor ? $", in department {doctor!.DepartmentId}" : "";
        await auditLog.LogAsync(
            "ChangeUserRole",
            "User",
            user.Id,
            $"User {user.Name} role changed from {oldRole} to {dto.NewRole}{department}");
        await context.SaveChangesAsync();
        stamps.Forget(user.Id);
        return ChangeRoleResultDto.Success();
    }
}
