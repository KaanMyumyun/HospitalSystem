using HospitalSystem.Interfaces;
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
    public async Task<ActionResult<CancelAppointmentResultDto>> CancelAppointment([FromBody] CancelAppointmentDto dto)
        => this.ToActionResult(await _appointmentCancellationService.CancelAppointmentAsync(dto));
}
