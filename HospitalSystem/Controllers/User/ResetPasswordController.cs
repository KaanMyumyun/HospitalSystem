using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HospitalSystem.Interface.User;
 
namespace HospitalSystem.Controllers;
 
[ApiController]
[Route("api/Users")]
public class ResetPasswordController : ControllerBase
{
    private readonly IResetPasswordService _resetPasswordService;
 
    public ResetPasswordController(IResetPasswordService resetPasswordService)
    {
        _resetPasswordService = resetPasswordService;
    }
 
    [Authorize(Roles = "Admin")]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
 
        var result = await _resetPasswordService.ResetPasswordAsync(dto);
 
        if (!result.IsSuccess)
            return BadRequest(result);
 
        return Ok(result);
    }
}
