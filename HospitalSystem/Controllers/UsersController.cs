using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;


[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {

        _userService = userService;
    }

    [HttpPost("change-role")]
    public async Task<IActionResult> ChangeRole([FromBody] ChangeRoleDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        ChangeRoleResultDto result = await _userService.ChangeRoleAsync(dto);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        ResetPasswordResultDto result = await _userService.ResetPasswordAsync(dto);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    [HttpGet]
    public async Task<ActionResult<List<UserDisplayDto>>> ListUsersAsync()
    {
        var users = await _userService.ListUsersAsync();
        return Ok(users);
    }

}