using HospitalSystem.Interfaces.Appointments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/Appointments")]
public class AppointmentStatusController : ControllerBase
{
    private readonly IAppointmentStatusService _appointmentStatusService;

    public AppointmentStatusController(IAppointmentStatusService appointmentStatusService)
    {
        _appointmentStatusService = appointmentStatusService;
    }

    // Completed or NoShow, once the appointment has started.
    [Authorize(Roles = "FrontDesk,Doctor")]
    [HttpPost("ChangeAppointmentStatus")]
    public async Task<ActionResult<AppointmentStatusResultDto>> ChangeAppointmentStatus([FromBody] ChangeAppointmentStatusDto dto)
        => this.ToActionResult(await _appointmentStatusService.ChangeStatusAsync(dto));
}
