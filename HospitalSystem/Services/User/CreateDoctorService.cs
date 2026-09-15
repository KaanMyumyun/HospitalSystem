using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.User;
 
namespace HospitalSystem.Services.User;
 
public class CreateDoctorService : ICreateDoctorService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public CreateDoctorService(ApplicationDbContext context, ICurrentUserService currentUser, IAuditLogService auditLog)
    {
        _context = context;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }
 
    public async Task<CreateDoctorResultDto> CreateDoctorAsync(CreateDoctorDto dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return CreateDoctorResultDto.Fail("You are not allowed to create a doctor");
 
        var user = await _context.Users.FindAsync(dto.UserId);
        if (user == null)
            return CreateDoctorResultDto.Fail("User not found");
 
        var department = await _context.Departments.FindAsync(dto.DepartmentId);
        if (department == null)
            return CreateDoctorResultDto.Fail("Department not found");
 
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == dto.UserId);
 
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

        user.Role = UserRole.Doctor;
        await _context.SaveChangesAsync();

        await _auditLog.LogAsync("CreateDoctor", "Doctor", doctor.Id, $"User {user.Name} made a doctor in department {dto.DepartmentId}");
        await _context.SaveChangesAsync();

        return CreateDoctorResultDto.Success();
    }
}
