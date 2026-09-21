using HospitalSystem.Interfaces.Calendar;
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
    public async Task<ActionResult<ServiceResult<List<ViewSchedule>>>> ViewSchedule()
    {
        var result = await _queryService.ViewScheduleAsync();

        if (!result.IsSuccess)
            return BadRequest(result);

        return Ok(result);
    }
}