using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HospitalSystem.Interfaces.User;
 
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
    public async Task<ActionResult<ResetPasswordResultDto>> ResetPassword([FromBody] ResetPasswordDto dto)
        => this.ToActionResult(await _resetPasswordService.ResetPasswordAsync(dto));
}
