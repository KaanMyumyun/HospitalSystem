using HospitalSystem.Interface.Calendar;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/schedule")]
public class ScheduleQueryController : ControllerBase
{
    private readonly IScheduleQueryService _queryService;

    public ScheduleQueryController(IScheduleQueryService queryService)
    {
        _queryService = queryService;
    }

    [Authorize(Roles = "FrontDesk,Admin,DemoAdmin,DemoFrontDesk")]
    [HttpGet("list-schedule")]
    public async Task<ActionResult<List<ViewSchedule>>> ViewSchedule()
    {
        var schedule = await _queryService.ViewScheduleAsync();
        return Ok(schedule);
    }
}