using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.User;
 
namespace HospitalSystem.Services.User;
 
public class UserQueryService : IUserQueryService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
 
    public UserQueryService(ApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }
 
    public async Task<ServiceResult<PagedResult<UserDisplayDto>>> ListUsersAsync(UserQueryDto query)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
        {
            return ServiceResult<PagedResult<UserDisplayDto>>.Fail("Not allowed to list users");
        }

        if (query.Page < 1 || query.Page > UserQueryDto.MaxPage)
            return ServiceResult<PagedResult<UserDisplayDto>>.Fail($"Page must be between 1 and {UserQueryDto.MaxPage}");

        if (query.PageSize < 1 || query.PageSize > UserQueryDto.MaxPageSize)
            return ServiceResult<PagedResult<UserDisplayDto>>.Fail($"Page size must be between 1 and {UserQueryDto.MaxPageSize}");

        var users = _context.Users.AsQueryable();
        var search = query.Search?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(search))
        {
            // Roles are stored by name, so pick the matching ones here and let
            // the database compare whole values.
            var matchingRoles = Enum.GetValues<UserRole>()
                .Where(role => role.ToString().Contains(search, StringComparison.OrdinalIgnoreCase))
                .ToList();
            users = users.Where(u => u.Name.ToLower().Contains(search) || matchingRoles.Contains(u.Role));
        }

        var items = await users
            .OrderBy(u => u.Name)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(u => new UserDisplayDto
            {
                UserId = u.Id,
                UserName = u.Name,
                Role = u.Role
            })
            .ToListAsync();

        // A first page with room to spare already holds every match.
        var totalCount = query.Page == 1 && items.Count < query.PageSize
            ? items.Count
            : await users.CountAsync();

        return ServiceResult<PagedResult<UserDisplayDto>>.Success(new PagedResult<UserDisplayDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize
        });
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
