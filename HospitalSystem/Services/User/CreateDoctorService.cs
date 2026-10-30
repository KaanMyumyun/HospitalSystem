using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.User;
using HospitalSystem.Services.Auth;

namespace HospitalSystem.Services.User;

public class CreateDoctorService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog,
    SecurityStampCache stamps) : ICreateDoctorService
{
    public async Task<CreateDoctorResultDto> CreateDoctorAsync(CreateDoctorDto dto, CancellationToken cancellationToken = default)
    {
        if (currentUser.RequireAdmin<CreateDoctorResultDto>("create a doctor") is { } refusal)
            return refusal;

        var found = await context.Users
            .Where(u => u.Id == dto.UserId)
            .Select(u => new
            {
                User = u,
                u.Doctor,
                DepartmentIsActive = context.Departments
                    .Where(d => d.Id == dto.DepartmentId)
                    .Select(d => (bool?)d.IsActive)
                    .FirstOrDefault()
            })
            .FirstOrDefaultAsync(cancellationToken);
        if (found == null)
            return CreateDoctorResultDto.NotFound("User not found");

        var user = found.User;
        if (user.Role is not (UserRole.Pending or UserRole.Doctor))
            return CreateDoctorResultDto.Fail("Only pending users or doctors can be made a doctor");

        if (found.DepartmentIsActive is not bool departmentIsActive)
            return CreateDoctorResultDto.NotFound("Department not found");

        if (!departmentIsActive)
            return CreateDoctorResultDto.Fail("Department is not active");

        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

        if (user.Role != UserRole.Doctor)
        {
            var roleError = await RoleChange.ApplyAsync(context, currentUser, user, UserRole.Doctor, cancellationToken);
            if (roleError is not null)
                return CreateDoctorResultDto.Fail(roleError);
        }

        var doctor = found.Doctor;

        if (doctor == null)
        {
            doctor = new DoctorEntity
            {
                UserId = dto.UserId,
                DepartmentId = dto.DepartmentId,
                IsActive = true
            };
            context.Doctors.Add(doctor);
        }
        else
        {
            doctor.DepartmentId = dto.DepartmentId;
            doctor.IsActive = true;
        }

        await context.SaveChangesAsync(cancellationToken);

        await auditLog.LogAsync(
            "CreateDoctor",
            "Doctor",
            doctor.Id,
            $"User {user.Name} made a doctor in department {dto.DepartmentId}",
            cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        stamps.Forget(user.Id);

        return CreateDoctorResultDto.Success();
    }
}
