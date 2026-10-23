using System.Security.Claims;
using HospitalSystem.Interfaces;

namespace HospitalSystem.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public string? UserId =>
        httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    // Role claims may come as ClaimTypes.Role or a plain "role", and a name
    // with spaces ("Front Desk") still matches its enum value.
    public bool IsInRole(UserRole role)
    {
        var roleName = role.ToString();

        return httpContextAccessor.HttpContext?.User.Claims
            .Any(c => (c.Type == ClaimTypes.Role || c.Type == "role")
                      && c.Value.Replace(" ", "") == roleName) ?? false;
    }
}
