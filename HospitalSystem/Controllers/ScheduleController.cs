using HospitalSystem.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScheduleController : ControllerBase
{
    private readonly ICalendarService _calendarService;

    public ScheduleController(ICalendarService calendarService)
    {
        _calendarService = calendarService;
    }
    [Authorize(Roles = "Admin")]
    [HttpPost("create-schedule")]
    public async Task<IActionResult> CreateSchedule([FromBody] CreateSchedule dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        CalendarActionResult result = await _calendarService.CreateScheduleAsync(dto);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("change-schedule")]
    public async Task<IActionResult> ChangeSchedule([FromBody] ChangeScheduleDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        CalendarActionResult result = await _calendarService.ChangeScheduleAsync(dto);
        if (!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    [Authorize(Roles = "FrontDesk,Admin,DemoAdmin,DemoFrontDesk")]
    [HttpGet("list-schedule")]
    public async Task<ActionResult<List<ViewSchedule>>> ViewSchedule()
    {
        var schedule = await _calendarService.ViewScheduleAsync();
        return Ok(schedule);
    }
    

}