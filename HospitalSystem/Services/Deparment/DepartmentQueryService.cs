using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interface;
using HospitalSystem.Interface.Department;
 
namespace HospitalSystem.Services;
 
public class DepartmentQueryService : IDepartmentQueryService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
 
    public DepartmentQueryService(ApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }
 
    public async Task<ServiceResult<List<ViewDepartmentDto>>> ListDepartmentsAsync()
    {
        if (!_currentUser.IsInRole(UserRole.Admin) &&
            !_currentUser.IsInRole(UserRole.FrontDesk) &&
            !_currentUser.IsInRole(UserRole.DemoAdmin) &&
            !_currentUser.IsInRole(UserRole.DemoFrontDesk))
        {
            return ServiceResult<List<ViewDepartmentDto>>.Fail("Not allowed to list deparments");
        }
 
        var departments = await _context.Departments
            .Select(d => new ViewDepartmentDto
            {
                Id = d.Id,
                Name = d.Department,
                IsActive = d.IsActive
            })
            .ToListAsync();
 
        return ServiceResult<List<ViewDepartmentDto>>.Success(departments);
    }
}
