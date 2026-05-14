using HospitalSystem.Interface.Calendar;
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
    public async Task<IActionResult> CreateSchedule([FromBody] CreateSchedule dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _creationService.CreateScheduleAsync(dto);

        if (!result.IsSuccess)
            return BadRequest(result);

        return Ok(result);
    }
}