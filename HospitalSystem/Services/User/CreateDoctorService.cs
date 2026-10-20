using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.User;
using HospitalSystem.Services.Auth;
 
namespace HospitalSystem.Services.User;
 
public class CreateDoctorService : ICreateDoctorService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;
    private readonly SecurityStampCache _stamps;

    public CreateDoctorService(ApplicationDbContext context, ICurrentUserService currentUser, IAuditLogService auditLog, SecurityStampCache stamps)
    {
        _context = context;
        _currentUser = currentUser;
        _auditLog = auditLog;
        _stamps = stamps;
    }
 
    public async Task<CreateDoctorResultDto> CreateDoctorAsync(CreateDoctorDto dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return CreateDoctorResultDto.Fail("You are not allowed to create a doctor");
 
        // The user's doctor row, if any, and the department come with the user:
        // one query instead of three.
        var found = await _context.Users
            .Where(u => u.Id == dto.UserId)
            .Select(u => new
            {
                User = u,
                u.Doctor,
                DepartmentIsActive = _context.Departments
                    .Where(d => d.Id == dto.DepartmentId)
                    .Select(d => (bool?)d.IsActive)
                    .FirstOrDefault()
            })
            .FirstOrDefaultAsync();
        if (found == null)
            return CreateDoctorResultDto.Fail("User not found");

        var user = found.User;
        if (user.Role is not (UserRole.Pending or UserRole.Doctor))
            return CreateDoctorResultDto.Fail("Only pending users or doctors can be made a doctor");

        if (found.DepartmentIsActive is not bool departmentIsActive)
            return CreateDoctorResultDto.Fail("Department not found");

        if (!departmentIsActive)
            return CreateDoctorResultDto.Fail("Department is not active");

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (user.Role != UserRole.Doctor)
        {
            var roleError = await RoleChange.ApplyAsync(_context, _currentUser, user, UserRole.Doctor);
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
            _context.Doctors.Add(doctor);
        }
        else
        {
            doctor.DepartmentId = dto.DepartmentId;
            doctor.IsActive = true;
        }

        await _context.SaveChangesAsync();

        await _auditLog.LogAsync("CreateDoctor", "Doctor", doctor.Id, $"User {user.Name} made a doctor in department {dto.DepartmentId}");
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        _stamps.Forget(user.Id);

        return CreateDoctorResultDto.Success();
    }
}
