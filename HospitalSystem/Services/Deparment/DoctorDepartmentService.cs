using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interface;
using HospitalSystem.Interface.Department;
 
namespace HospitalSystem.Services;
 
public class DoctorDepartmentService : IDoctorDepartmentService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
 
    public DoctorDepartmentService(ApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }
 
    public async Task<DepartmentActionResultDto> ChangeDoctorDepartmentAsync(ChangeDoctorDepartmentDto dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return DepartmentActionResultDto.Fail("You are not allowed to change doctor department");
 
        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.Id == dto.DoctorId);
        if (doctor == null)
            return DepartmentActionResultDto.Fail("Doctor doesnt exist ");
 
        if (!doctor.IsActive)
            return DepartmentActionResultDto.Fail("This Doctor isnt active");
 
        var department = await _context.Departments.FirstOrDefaultAsync(d => d.Id == dto.DepartmentId);
        if (department == null)
            return DepartmentActionResultDto.Fail("Department doesnt exist");
 
        if (!department.IsActive)
            return DepartmentActionResultDto.Fail("This Deparment isnt active");
 
        if (doctor.DepartmentId == dto.DepartmentId)
            return DepartmentActionResultDto.Fail("Already in that department");
 
        doctor.DepartmentId = dto.DepartmentId;
        await _context.SaveChangesAsync();
 
        return DepartmentActionResultDto.Success();
    }
}
