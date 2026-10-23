using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.User;

namespace HospitalSystem.Services.User;

public class UserQueryService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    TimeProvider clock) : IUserQueryService
{
    public async Task<ServiceResult<PagedResult<UserDisplayDto>>> ListUsersAsync(UserQueryDto query)
    {
        if (!currentUser.IsAdmin())
            return ServiceResult<PagedResult<UserDisplayDto>>.Forbidden("Not allowed to list users");

        if (query.Page < 1 || query.Page > UserQueryDto.MaxPage)
            return ServiceResult<PagedResult<UserDisplayDto>>.Fail($"Page must be between 1 and {UserQueryDto.MaxPage}");

        if (query.PageSize < 1 || query.PageSize > UserQueryDto.MaxPageSize)
            return ServiceResult<PagedResult<UserDisplayDto>>.Fail($"Page size must be between 1 and {UserQueryDto.MaxPageSize}");

        var users = context.Users.AsQueryable();
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

        var now = clock.GetUtcNow().UtcDateTime;
        var rows = await users
            .OrderBy(u => u.Name)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(u => new
            {
                Item = new UserDisplayDto
                {
                    UserId = u.Id,
                    UserName = u.Name,
                    Role = u.Role,
                    LockedUntil = u.LockedUntil > now ? u.LockedUntil : null
                },
                // Counted by the same statement, so a page and its total cost
                // one round trip.
                TotalCount = users.Count()
            })
            .ToListAsync();

        // An empty page carries no total. On page 1 there is nothing to
        // count; a later page is past the last match and needs its own count.
        var totalCount = rows.Count > 0 ? rows[0].TotalCount
            : query.Page == 1 ? 0
            : await users.CountAsync();

        return ServiceResult<PagedResult<UserDisplayDto>>.Success(new PagedResult<UserDisplayDto>
        {
            Items = rows.Select(r => r.Item).ToList(),
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize
        });
    }

    public async Task<ServiceResult<List<DoctorDisplayDto>>> ListDoctorsAsync()
    {
        if (!currentUser.CanReadReferenceData())
            return ServiceResult<List<DoctorDisplayDto>>.Forbidden("You are not allowed to list doctors");

        var doctors = await context.Doctors
            .Where(d => d.User.Role == UserRole.Doctor)
            .OrderBy(d => d.User.Name)
            .Select(d => new DoctorDisplayDto
            {
                DoctorId = d.Id,
                DepartmentId = d.DepartmentId,
                Name = d.User.Name,
                UserId = d.UserId,
                IsActive = d.IsActive
            })
            .ToListAsync();

        return ServiceResult<List<DoctorDisplayDto>>.Success(doctors);
    }
}
