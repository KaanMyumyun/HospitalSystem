using System.Security.Claims;
using HospitalSystem.Interface;
using HospitalSystem.Interfaces.Appointments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
 
namespace HospitalSystem.Controllers;
 
[ApiController]
[Route("api/Appointments")]
public class AppointmentCreationController : ControllerBase
{
    private readonly IAppointmentCreationService _appointmentCreationService;
 
    public AppointmentCreationController(IAppointmentCreationService appointmentCreationService)
    {
        _appointmentCreationService = appointmentCreationService;
    }
 
    [Authorize(Roles = "FrontDesk")]
    [HttpPost("CreateAppointment")]
    public async Task<IActionResult> CreateAppointment([FromBody] CreateAppointmentDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
 
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("UserId")?.Value;
 
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            return Unauthorized(new { Message = "Invalid or missing User ID claim in token." });
 
        var result = await _appointmentCreationService.CreateAppointmentAsync(dto, userId);
 
        if (!result.IsSuccess)
            return BadRequest(result);
 
        return Ok(result);
    }
}
