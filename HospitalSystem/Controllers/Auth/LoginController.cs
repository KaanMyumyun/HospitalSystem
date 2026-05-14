using HospitalSystem.Interface.Auth;
using Microsoft.AspNetCore.Mvc;
 
[ApiController]
[Route("api/Auth")]
public class LoginController : ControllerBase
{
    private readonly ILoginService _loginService;
 
    public LoginController(ILoginService loginService)
    {
        _loginService = loginService;
    }
 
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var result = await _loginService.LoginAsync(dto);
 
        if (!result.IsSuccess)
            return Unauthorized(result);
 
        return Ok(result);
    }
}
