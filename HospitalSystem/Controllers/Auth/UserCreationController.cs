using HospitalSystem.Interface.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
 
[ApiController]
[Route("api/Auth")]
public class UserCreationController : ControllerBase
{
    private readonly IUserCreationService _userCreationService;
 
    public UserCreationController(IUserCreationService userCreationService)
    {
        _userCreationService = userCreationService;
    }
 
    [Authorize(Roles = "Admin")]
    [HttpPost("CreateUser")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
 
        var result = await _userCreationService.CreateUserAsync(dto);
 
        if (!result.IsSuccess)
            return BadRequest(result);
 
        return Ok(result);
    }
}
