using HospitalSystem.Interfaces.Calendar;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/schedules")]
public class SchedulesController : ControllerBase
{
    [Authorize(Roles = "FrontDesk,Admin,DemoAdmin,DemoFrontDesk")]
    [HttpGet]
    public async Task<ActionResult<ServiceResult<List<ViewSchedule>>>> ListSchedules(
        [FromServices] IScheduleQueryService service, CancellationToken cancellationToken)
        => this.ToActionResult(await service.ViewScheduleAsync(cancellationToken));

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<CalendarActionResult>> CreateSchedule(
        [FromBody] CreateSchedule dto, [FromServices] IScheduleCreationService service, CancellationToken cancellationToken)
        => this.ToActionResult(await service.CreateScheduleAsync(dto, cancellationToken));

    // Replaces the hours, slot length and working days.
    [Authorize(Roles = "Admin")]
    [HttpPut("{scheduleId:int}")]
    public async Task<ActionResult<CalendarActionResult>> ChangeSchedule(
        int scheduleId, [FromBody] ChangeScheduleDto dto, [FromServices] IScheduleModificationService service,
        CancellationToken cancellationToken)
    {
        dto.ScheduleId = scheduleId;
        return this.ToActionResult(await service.ChangeScheduleAsync(dto, cancellationToken));
    }
}
