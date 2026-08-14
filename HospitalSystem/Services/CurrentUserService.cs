using System.Security.Claims;
using HospitalSystem.Interface;
namespace HospitalSystem.Services;
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
            .FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

  public bool IsInRole(UserRole role)
{
    var roleName = role.ToString();
    
    return _httpContextAccessor.HttpContext?.User?.Claims
        .Any(c => (c.Type == ClaimTypes.Role || c.Type == "role") 
                  && c.Value.Replace(" ", "") == roleName) ?? false;
}
}
