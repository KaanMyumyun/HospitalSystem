using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class AppointmentsController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;
    public AppointmentsController(IAppointmentService appointmentService)
    {
        _appointmentService = appointmentService;
    }


    [Authorize(Roles = "FrontDesk")]
    [HttpPost("CreateAppointment")]
    public async Task<IActionResult> CreateAppointment([FromBody] CreateAppointmentDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        
        var userId = int.Parse(User.FindFirst("UserId").Value);
        var result = await _appointmentService.CreateAppointmentAsync(dto,userId);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }


    [HttpGet]
    public async Task<ActionResult<List<ViewAppointmentDto>>> ListAppointmentAsync()
    {
        var appointment = await _appointmentService.GetAppointmentsAsync();
        return Ok(appointment);
    }
    
    [Authorize(Roles = "FrontDesk")]
    [HttpPost("CancelAppointment")]
    public async Task<IActionResult> CancelAppointment([FromBody] CancelAppointmentDto dto)
    {
        if(!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        var result = await _appointmentService.CancelAppointmentAsync(dto);

        if(!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);      
    }

}