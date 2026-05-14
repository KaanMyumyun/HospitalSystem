using HospitalSystem.Interface;
using HospitalSystem.Interfaces.Appointments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
 
namespace HospitalSystem.Controllers;
 
[ApiController]
[Route("api/Appointments")]
public class AppointmentCancellationController : ControllerBase
{
    private readonly IAppointmentCancellationService _appointmentCancellationService;
 
    public AppointmentCancellationController(IAppointmentCancellationService appointmentCancellationService)
    {
        _appointmentCancellationService = appointmentCancellationService;
    }
 
    [Authorize(Roles = "FrontDesk")]
    [HttpPost("CancelAppointment")]
    public async Task<IActionResult> CancelAppointment([FromBody] CancelAppointmentDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
 
        var result = await _appointmentCancellationService.CancelAppointmentAsync(dto);
 
        if (!result.IsSuccess)
            return BadRequest(result);
 
        return Ok(result);
    }
}
