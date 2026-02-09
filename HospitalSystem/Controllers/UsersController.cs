using HospitalSystem.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

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

    [HttpPost("create-doctor")]
    public async Task<IActionResult>CreateDoctor([FromBody]CreateDoctorDto dto)
    {
        if (!ModelState.IsValid)
        return BadRequest(ModelState);
        
        CreateDoctorResultDto result = await _userService.CreateDoctorAsync(dto);
        
        if (!result.IsSuccess)
        return BadRequest(result);
        
        return Ok();
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

    [HttpPost("change-doctor-status")]
    public async Task<IActionResult> ChangeDoctorStatus([FromBody] ChangeDoctorsStatus dto)
    {
         if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        
        ChangeDoctorsStatusResult result = await _userService.ChangeDoctorsStatusAsync(dto);
        if(!result.IsSuccess)
        {
            return BadRequest(result);
        }
        
        return Ok(result);          
    }

    [HttpGet("ListUsers")]
    public async Task<ActionResult<List<UserDisplayDto>>> ListUsersAsync()
    {
        var users = await _userService.ListUsersAsync();
        return Ok(users);
    }
    [HttpGet("ListDoctors")]
    public async Task<ActionResult<List<DoctorDisplayDto>>> ListDoctorsAsync()
    {
        var users = await _userService.ListDoctorsAsync();
        return Ok(users);
    }
}