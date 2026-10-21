using HospitalSystem.Interfaces.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/Auth")]
public class ChangePasswordController : ControllerBase
{
    private readonly IChangePasswordService _changePasswordService;

    public ChangePasswordController(IChangePasswordService changePasswordService)
    {
        _changePasswordService = changePasswordService;
    }

    // Limited like sign-in, since it checks a password too.
    [Authorize]
    [EnableRateLimiting("login")]
    [HttpPost("change-password")]
    public async Task<ActionResult<ChangePasswordResultDto>> ChangePassword([FromBody] ChangePasswordDto dto)
        => this.ToActionResult(await _changePasswordService.ChangeOwnPasswordAsync(dto));
}
