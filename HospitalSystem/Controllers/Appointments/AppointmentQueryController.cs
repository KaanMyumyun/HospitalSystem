using HospitalSystem.Interfaces;
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
    public async Task<ActionResult<ServiceResult<List<ViewAppointmentDto>>>> ListAppointments([FromQuery] AppointmentQueryDto query)
        => this.ToActionResult(await _appointmentQueryService.GetAppointmentsAsync(query));

    [Authorize(Roles = "Doctor")]
    [HttpGet("MyAppointments")]
    public async Task<ActionResult<ServiceResult<List<ViewAppointmentDto>>>> MyAppointments([FromQuery] MyAppointmentsQueryDto query)
        => this.ToActionResult(await _appointmentQueryService.GetMyAppointmentsAsync(query));
}
