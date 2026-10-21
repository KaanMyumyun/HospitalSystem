using HospitalSystem.Interfaces.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;
 
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
    public async Task<ActionResult<CreateUserResultDto>> CreateUser([FromBody] CreateUserDto dto)
        => this.ToActionResult(await _userCreationService.CreateUserAsync(dto));
}
