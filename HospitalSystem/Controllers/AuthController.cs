using HospitalSystem.Interfaces.Auth;
using HospitalSystem.Services.Auth;
using HospitalSystem.Startup;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    // Two limits: 20 a minute per address across usernames, and 5 a minute
    // per address and username (LoginRateLimitFilter).
    [AllowAnonymous]
    [HttpPost("login")]
    [EnableRateLimiting(RateLimits.SignIn)]
    [ServiceFilter(typeof(LoginRateLimitFilter))]
    public async Task<ActionResult<LoginResultDto>> Login(
        [FromBody] LoginDto dto, [FromServices] ILoginService service, CancellationToken cancellationToken)
    {
        var result = await service.LoginAsync(dto, cancellationToken);
        return result.IsSuccess ? Ok(result) : Unauthorized(result);
    }

    [AllowAnonymous]
    [HttpPost("demo-login")]
    [EnableRateLimiting(RateLimits.Login)]
    public async Task<ActionResult<LoginResultDto>> DemoLogin(
        [FromBody] DemoLoginDto dto, [FromServices] ILoginService service, CancellationToken cancellationToken)
    {
        var result = await service.DemoLoginAsync(dto.Role, cancellationToken);
        return result.IsSuccess ? Ok(result) : Unauthorized(result);
    }

    // A new token for the signed-in user, while their session lasts (12 hours
    // from signing in). The frontend asks before the current one runs out.
    [Authorize]
    [HttpPost("refresh")]
    public async Task<ActionResult<LoginResultDto>> Refresh(
        [FromServices] ISessionRenewalService service, CancellationToken cancellationToken)
    {
        var result = await service.RenewAsync(cancellationToken);
        return result.IsSuccess ? Ok(result) : StatusCode(StatusCodes.Status403Forbidden, result);
    }

    [Authorize]
    [HttpPost("change-password")]
    [EnableRateLimiting(RateLimits.Login)]
    public async Task<ActionResult<ChangePasswordResultDto>> ChangePassword(
        [FromBody] ChangePasswordDto dto, [FromServices] IChangePasswordService service, CancellationToken cancellationToken)
        => this.ToActionResult(await service.ChangeOwnPasswordAsync(dto, cancellationToken));
}
