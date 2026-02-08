using System.Security.Claims;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string UserId =>
        _httpContextAccessor.HttpContext?
            .User?
            .FindFirst(ClaimTypes.NameIdentifier)?.Value;

   public bool IsInRole(UserRole role)
{
    var roleName = role.ToString();
    return _httpContextAccessor.HttpContext?
        .User?
        .IsInRole(roleName) ?? false;
}
}
