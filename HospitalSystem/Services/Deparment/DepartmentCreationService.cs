using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interface;
using HospitalSystem.Interface.Department;
 
namespace HospitalSystem.Services;
 
public class DepartmentCreationService : IDepartmentCreationService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
 
    public DepartmentCreationService(ApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }
 
    public async Task<DepartmentActionResultDto> CreateDepartmentAsync(CreateDepartmentDto dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return DepartmentActionResultDto.Fail("You are not allowed to create a department");
 
        var exists = await _context.Departments.AnyAsync(d => d.Department == dto.Name);
        if (exists)
            return DepartmentActionResultDto.Fail("Department already exists");
 
        _context.Departments.Add(new DepartmentEntity { Department = dto.Name });
        await _context.SaveChangesAsync();
 
        return DepartmentActionResultDto.Success();
    }
}
