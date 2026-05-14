using HospitalSystem.Interface;
using HospitalSystem.Interfaces.Appointments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
 
namespace HospitalSystem.Controllers;
 
[ApiController]
[Route("api/Appointments")]
public class AppointmentQueryController : ControllerBase
{
    private readonly IAppointmentQueryService _appointmentQueryService;
 
    public AppointmentQueryController(IAppointmentQueryService appointmentQueryService)
    {
        _appointmentQueryService = appointmentQueryService;
    }
 
    [Authorize(Roles = "FrontDesk,DemoFrontDesk")]
    [HttpGet("ListAppointments")]
    public async Task<IActionResult> ListAppointments()
    {
        var result = await _appointmentQueryService.GetAppointmentsAsync();
 
        if (!result.IsSuccess)
            return BadRequest(result);
 
        return Ok(result);
    }
}
