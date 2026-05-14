using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interface;
using HospitalSystem.Interface.User;
 
namespace HospitalSystem.Services;
 
public class UserQueryService : IUserQueryService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
 
    public UserQueryService(ApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }
 
    public async Task<ServiceResult<List<UserDisplayDto>>> ListUsersAsync()
    {
        if (!_currentUser.IsInRole(UserRole.Admin) &&
            !_currentUser.IsInRole(UserRole.FrontDesk) &&
            !_currentUser.IsInRole(UserRole.DemoAdmin) &&
            !_currentUser.IsInRole(UserRole.DemoFrontDesk))
        {
            return ServiceResult<List<UserDisplayDto>>.Fail("Not allowed to list users");
        }
 
        var users = await _context.Users
            .Select(u => new UserDisplayDto
            {
                UserId = u.Id,
                UserName = u.Name,
                Role = u.Role
            })
            .ToListAsync();
 
        return ServiceResult<List<UserDisplayDto>>.Success(users);
    }
 
    public async Task<ServiceResult<List<DoctorDisplayDto>>> ListDoctorsAsync()
    {
        if (!_currentUser.IsInRole(UserRole.Admin) &&
            !_currentUser.IsInRole(UserRole.FrontDesk) &&
            !_currentUser.IsInRole(UserRole.DemoAdmin) &&
            !_currentUser.IsInRole(UserRole.DemoFrontDesk))
        {
            return ServiceResult<List<DoctorDisplayDto>>.Fail("You are not allowed to list doctors");
        }
 
        var doctors = await _context.Doctors
            .Include(d => d.User)
            .Where(d => d.User.Role == UserRole.Doctor)
            .Select(d => new DoctorDisplayDto
            {
                DoctorId = d.Id,
                DeparmentId = d.DepartmentId,
                Name = d.User.Name,
                UserId = d.UserId,
                IsActive = d.IsActive
            })
            .ToListAsync();
 
        return ServiceResult<List<DoctorDisplayDto>>.Success(doctors);
    }
}
