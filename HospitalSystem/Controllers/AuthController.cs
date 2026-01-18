using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    public AuthController(ApplicationDbContext applicationDbContext, IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("CreateUser")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        CreateUserResultDto result = await _authService.CreateUser(dto);
        if(!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);
       
    }

    [HttpPost("login")]
    public async Task<IActionResult> LogIn([FromBody] LoginDto dto)
    {
        LoginResultDto result = await _authService.LoginAsync(dto);
        if (!result.IsSuccess)
        {
            return Unauthorized(result);
        }
        return Ok(result);
    }

}