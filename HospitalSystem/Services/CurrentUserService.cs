using System.Globalization;
using System.Security.Claims;
using HospitalSystem.Interfaces;
using HospitalSystem.Services.Auth;

namespace HospitalSystem.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public string? UserId =>
        httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    // Null for a token issued before tokens carried the username.
    public string? UserName =>
        httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.Name)?.Value;

    // When the session began; null for a token issued before tokens said so.
    public DateTimeOffset? SignedInAt =>
        long.TryParse(
            httpContextAccessor.HttpContext?.User.FindFirst(SessionTokens.SignedInAtClaimType)?.Value,
            NumberStyles.None,
            CultureInfo.InvariantCulture,
            out var seconds)
            ? DateTimeOffset.FromUnixTimeSeconds(seconds)
            : null;

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
