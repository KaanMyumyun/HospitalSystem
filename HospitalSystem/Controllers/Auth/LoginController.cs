using HospitalSystem.Interfaces.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

[ApiController]
[Route("api/Auth")]
[EnableRateLimiting("login")]
public class LoginController : ControllerBase
{
    private readonly ILoginService _loginService;

    public LoginController(ILoginService loginService)
    {
        _loginService = loginService;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var result = await _loginService.LoginAsync(dto);

        if (!result.IsSuccess)
            return Unauthorized(result);

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("demo-login")]
    public async Task<IActionResult> DemoLogin([FromBody] DemoLoginDto dto)
    {
        var result = await _loginService.DemoLoginAsync(dto.Role);

        if (!result.IsSuccess)
            return Unauthorized(result);

        return Ok(result);
    }
}
