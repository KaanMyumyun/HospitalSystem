using HospitalSystem.Interfaces.Calendar;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/schedule")]
public class ScheduleCreationController : ControllerBase
{
    private readonly IScheduleCreationService _creationService;

    public ScheduleCreationController(IScheduleCreationService creationService)
    {
        _creationService = creationService;
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("create-schedule")]
    public async Task<ActionResult<CalendarActionResult>> CreateSchedule([FromBody] CreateSchedule dto)
        => this.ToActionResult(await _creationService.CreateScheduleAsync(dto));
}