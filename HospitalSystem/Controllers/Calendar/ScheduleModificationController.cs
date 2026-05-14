using HospitalSystem.Interface.Calendar;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/schedule")]
public class ScheduleModificationController : ControllerBase
{
    private readonly IScheduleModificationService _modificationService;

    public ScheduleModificationController(IScheduleModificationService modificationService)
    {
        _modificationService = modificationService;
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("change-schedule")]
    public async Task<IActionResult> ChangeSchedule([FromBody] ChangeScheduleDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _modificationService.ChangeScheduleAsync(dto);

        if (!result.IsSuccess)
            return BadRequest(result);

        return Ok(result);
    }
}