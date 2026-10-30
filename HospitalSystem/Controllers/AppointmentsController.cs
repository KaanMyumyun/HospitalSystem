using HospitalSystem.Interfaces.Appointments;
using HospitalSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/appointments")]
public class AppointmentsController : ControllerBase
{
    [Authorize(Policy = Access.DeskReads)]
    [HttpGet]
    public async Task<ActionResult<ServiceResult<List<ViewAppointmentDto>>>> ListAppointments(
        [FromQuery] AppointmentQueryDto query, [FromServices] IAppointmentQueryService service,
        CancellationToken cancellationToken)
        => this.ToActionResult(await service.GetAppointmentsAsync(query, cancellationToken));

    [Authorize(Policy = Access.Doctor)]
    [HttpGet("mine")]
    public async Task<ActionResult<ServiceResult<List<ViewAppointmentDto>>>> MyAppointments(
        [FromQuery] MyAppointmentsQueryDto query, [FromServices] IAppointmentQueryService service,
        CancellationToken cancellationToken)
        => this.ToActionResult(await service.GetMyAppointmentsAsync(query, cancellationToken));

    [Authorize(Policy = Access.Desk)]
    [HttpPost]
    public async Task<ActionResult<CreateAppointmentResultDto>> CreateAppointment(
        [FromBody] CreateAppointmentDto dto, [FromServices] IAppointmentCreationService service,
        CancellationToken cancellationToken)
        => this.ToActionResult(await service.CreateAppointmentAsync(dto, cancellationToken));

    [Authorize(Policy = Access.Desk)]
    [HttpPost("{appointmentId:int}/cancel")]
    public async Task<ActionResult<CancelAppointmentResultDto>> CancelAppointment(
        int appointmentId, [FromBody] CancelAppointmentDto dto, [FromServices] IAppointmentCancellationService service,
        CancellationToken cancellationToken)
    {
        dto.AppointmentId = appointmentId;
        return this.ToActionResult(await service.CancelAppointmentAsync(dto, cancellationToken));
    }

    [Authorize(Policy = Access.Desk)]
    [HttpPost("{appointmentId:int}/move")]
    public async Task<ActionResult<MoveAppointmentResultDto>> MoveAppointment(
        int appointmentId, [FromBody] MoveAppointmentDto dto, [FromServices] IAppointmentMoveService service,
        CancellationToken cancellationToken)
    {
        dto.AppointmentId = appointmentId;
        return this.ToActionResult(await service.MoveAsync(dto, cancellationToken));
    }

    [Authorize(Policy = Access.Desk)]
    [HttpGet("{appointmentId:int}/history")]
    public async Task<ActionResult<ServiceResult<List<AppointmentHistoryEntryDto>>>> AppointmentHistory(
        int appointmentId, [FromServices] IAppointmentQueryService service, CancellationToken cancellationToken)
        => this.ToActionResult(await service.GetHistoryAsync(appointmentId, cancellationToken));

    [Authorize(Policy = Access.DeskOrDoctor)]
    [HttpPatch("{appointmentId:int}/status")]
    public async Task<ActionResult<AppointmentStatusResultDto>> ChangeAppointmentStatus(
        int appointmentId, [FromBody] ChangeAppointmentStatusDto dto, [FromServices] IAppointmentStatusService service,
        CancellationToken cancellationToken)
    {
        dto.AppointmentId = appointmentId;
        return this.ToActionResult(await service.ChangeStatusAsync(dto, cancellationToken));
    }
}
