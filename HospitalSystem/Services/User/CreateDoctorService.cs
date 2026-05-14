using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interface;
using HospitalSystem.Interface.User;
 
namespace HospitalSystem.Services;
 
public class CreateDoctorService : ICreateDoctorService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
 
    public CreateDoctorService(ApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
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
            _context.Doctors.Add(new DoctorEntity
            {
                UserId = dto.UserId,
                DepartmentId = dto.DepartmentId,
                IsActive = true
            });
        }
        else
        {
            doctor.DepartmentId = dto.DepartmentId;
            doctor.IsActive = true;
        }
 
        user.Role = UserRole.Doctor;
        await _context.SaveChangesAsync();
 
        return CreateDoctorResultDto.Success();
    }
}
