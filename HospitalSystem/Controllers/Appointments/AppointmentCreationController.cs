using System.Security.Claims;
using HospitalSystem.Interfaces;
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
    public async Task<ActionResult<CreateAppointmentResultDto>> CreateAppointment([FromBody] CreateAppointmentDto dto)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("UserId")?.Value;
 
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            return Unauthorized(new { Message = "Invalid or missing User ID claim in token." });
 
        return this.ToActionResult(await _appointmentCreationService.CreateAppointmentAsync(dto, userId));
    }
}
