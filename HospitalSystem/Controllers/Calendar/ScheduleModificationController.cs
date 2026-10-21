using HospitalSystem.Interfaces.Calendar;
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
    public async Task<ActionResult<CalendarActionResult>> ChangeSchedule([FromBody] ChangeScheduleDto dto)
        => this.ToActionResult(await _modificationService.ChangeScheduleAsync(dto));
}