using System.Globalization;
using System.Security.Claims;
using HospitalSystem.Interfaces;
using HospitalSystem.Services.Auth;

namespace HospitalSystem.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public string? UserId =>
        httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    public string? UserName =>
        httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.Name)?.Value;

    public DateTimeOffset? SignedInAt =>
        long.TryParse(
            httpContextAccessor.HttpContext?.User.FindFirst(SessionTokens.SignedInAtClaimType)?.Value,
            NumberStyles.None,
            CultureInfo.InvariantCulture,
            out var seconds)
            ? DateTimeOffset.FromUnixTimeSeconds(seconds)
            : null;

    public bool IsInRole(UserRole role)
    {
        var roleName = role.ToString();

        return httpContextAccessor.HttpContext?.User.Claims
            .Any(c => (c.Type == ClaimTypes.Role || c.Type == "role")
                      && c.Value.Replace(" ", "") == roleName) ?? false;
    }
}
