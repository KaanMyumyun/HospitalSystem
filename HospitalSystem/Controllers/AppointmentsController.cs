using HospitalSystem.Interfaces.Appointments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/appointments")]
public class AppointmentsController : ControllerBase
{
    // One doctor's appointments in a time window, for the reception calendar.
    [Authorize(Roles = "FrontDesk,DemoFrontDesk")]
    [HttpGet]
    public async Task<ActionResult<ServiceResult<List<ViewAppointmentDto>>>> ListAppointments(
        [FromQuery] AppointmentQueryDto query, [FromServices] IAppointmentQueryService service,
        CancellationToken cancellationToken)
        => this.ToActionResult(await service.GetAppointmentsAsync(query, cancellationToken));

    [Authorize(Roles = "Doctor")]
    [HttpGet("mine")]
    public async Task<ActionResult<ServiceResult<List<ViewAppointmentDto>>>> MyAppointments(
        [FromQuery] MyAppointmentsQueryDto query, [FromServices] IAppointmentQueryService service,
        CancellationToken cancellationToken)
        => this.ToActionResult(await service.GetMyAppointmentsAsync(query, cancellationToken));

    [Authorize(Roles = "FrontDesk")]
    [HttpPost]
    public async Task<ActionResult<CreateAppointmentResultDto>> CreateAppointment(
        [FromBody] CreateAppointmentDto dto, [FromServices] IAppointmentCreationService service,
        CancellationToken cancellationToken)
        => this.ToActionResult(await service.CreateAppointmentAsync(dto, cancellationToken));

    // A cancelled appointment stays on record with its reason, so this is
    // not a DELETE.
    [Authorize(Roles = "FrontDesk")]
    [HttpPost("{appointmentId:int}/cancel")]
    public async Task<ActionResult<CancelAppointmentResultDto>> CancelAppointment(
        int appointmentId, [FromBody] CancelAppointmentDto dto, [FromServices] IAppointmentCancellationService service,
        CancellationToken cancellationToken)
    {
        dto.AppointmentId = appointmentId;
        return this.ToActionResult(await service.CancelAppointmentAsync(dto, cancellationToken));
    }

    // To another time, or another doctor, in one step, so nobody can take the
    // new slot in between. The appointment keeps its id and history.
    [Authorize(Roles = "FrontDesk")]
    [HttpPost("{appointmentId:int}/move")]
    public async Task<ActionResult<MoveAppointmentResultDto>> MoveAppointment(
        int appointmentId, [FromBody] MoveAppointmentDto dto, [FromServices] IAppointmentMoveService service,
        CancellationToken cancellationToken)
    {
        dto.AppointmentId = appointmentId;
        return this.ToActionResult(await service.MoveAsync(dto, cancellationToken));
    }

    // Who booked, moved, cancelled or marked it, oldest first.
    [Authorize(Roles = "FrontDesk")]
    [HttpGet("{appointmentId:int}/history")]
    public async Task<ActionResult<ServiceResult<List<AppointmentHistoryEntryDto>>>> AppointmentHistory(
        int appointmentId, [FromServices] IAppointmentQueryService service, CancellationToken cancellationToken)
        => this.ToActionResult(await service.GetHistoryAsync(appointmentId, cancellationToken));

    // Completed or NoShow, once the appointment has started.
    [Authorize(Roles = "FrontDesk,Doctor")]
    [HttpPatch("{appointmentId:int}/status")]
    public async Task<ActionResult<AppointmentStatusResultDto>> ChangeAppointmentStatus(
        int appointmentId, [FromBody] ChangeAppointmentStatusDto dto, [FromServices] IAppointmentStatusService service,
        CancellationToken cancellationToken)
    {
        dto.AppointmentId = appointmentId;
        return this.ToActionResult(await service.ChangeStatusAsync(dto, cancellationToken));
    }
}
