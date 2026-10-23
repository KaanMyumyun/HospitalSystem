using HospitalSystem.Interfaces.Auth;
using HospitalSystem.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    [ServiceFilter(typeof(LoginRateLimitFilter))]
    public async Task<ActionResult<LoginResultDto>> Login([FromBody] LoginDto dto, [FromServices] ILoginService service)
    {
        var result = await service.LoginAsync(dto);
        return result.IsSuccess ? Ok(result) : Unauthorized(result);
    }

    [AllowAnonymous]
    [HttpPost("demo-login")]
    [EnableRateLimiting("login")]
    public async Task<ActionResult<LoginResultDto>> DemoLogin([FromBody] DemoLoginDto dto, [FromServices] ILoginService service)
    {
        var result = await service.DemoLoginAsync(dto.Role);
        return result.IsSuccess ? Ok(result) : Unauthorized(result);
    }

    [Authorize]
    [HttpPost("change-password")]
    [EnableRateLimiting("login")]
    public async Task<ActionResult<ChangePasswordResultDto>> ChangePassword(
        [FromBody] ChangePasswordDto dto, [FromServices] IChangePasswordService service)
        => this.ToActionResult(await service.ChangeOwnPasswordAsync(dto));
}
