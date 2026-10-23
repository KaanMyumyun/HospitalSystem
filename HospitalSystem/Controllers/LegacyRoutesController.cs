using System.Text.Json.Serialization;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Appointments;
using HospitalSystem.Interfaces.Auth;
using HospitalSystem.Interfaces.Calendar;
using HospitalSystem.Interfaces.Department;
using HospitalSystem.Interfaces.User;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

// Keep the previous frontend working while the API and Pages deploy separately.
// Remove these aliases after the new frontend has been the only published one
// for a release. They do not belong in the new OpenAPI contract.
[ApiController]
[ApiExplorerSettings(IgnoreApi = true)]
[Route("api")]
[Authorize]
public class LegacyRoutesController : ControllerBase
{
    [Authorize(Roles = "FrontDesk,DemoFrontDesk")]
    [HttpGet("Appointments/ListAppointments")]
    public async Task<ActionResult<ServiceResult<List<ViewAppointmentDto>>>> ListAppointments(
        [FromQuery] AppointmentQueryDto query, [FromServices] IAppointmentQueryService service)
        => this.ToActionResult(await service.GetAppointmentsAsync(query));

    [Authorize(Roles = "Doctor")]
    [HttpGet("Appointments/MyAppointments")]
    public async Task<ActionResult<ServiceResult<List<ViewAppointmentDto>>>> MyAppointments(
        [FromQuery] MyAppointmentsQueryDto query, [FromServices] IAppointmentQueryService service)
        => this.ToActionResult(await service.GetMyAppointmentsAsync(query));

    [Authorize(Roles = "FrontDesk")]
    [HttpPost("Appointments/CreateAppointment")]
    public async Task<ActionResult<CreateAppointmentResultDto>> CreateAppointment(
        [FromBody] CreateAppointmentDto dto, [FromServices] IAppointmentCreationService service)
        => this.ToActionResult(await service.CreateAppointmentAsync(dto));

    [Authorize(Roles = "FrontDesk")]
    [HttpPost("Appointments/CancelAppointment")]
    public async Task<ActionResult<CancelAppointmentResultDto>> CancelAppointment(
        [FromBody] LegacyCancelAppointmentDto dto, [FromServices] IAppointmentCancellationService service)
        => this.ToActionResult(await service.CancelAppointmentAsync(dto));

    [Authorize(Roles = "FrontDesk,Doctor")]
    [HttpPost("Appointments/ChangeAppointmentStatus")]
    public async Task<ActionResult<AppointmentStatusResultDto>> ChangeAppointmentStatus(
        [FromBody] LegacyChangeAppointmentStatusDto dto, [FromServices] IAppointmentStatusService service)
        => this.ToActionResult(await service.ChangeStatusAsync(dto));

    [Authorize(Roles = "FrontDesk,DemoFrontDesk")]
    [HttpGet("Patients/ListPatients")]
    public async Task<ActionResult<ServiceResult<PagedResult<PatientSummaryDto>>>> ListPatients(
        [FromQuery] PatientQueryDto query, [FromServices] IPatientRecordService service)
        => this.ToActionResult(await service.ListPatientsAsync(query));

    [Authorize(Roles = "FrontDesk")]
    [HttpPost("Patients/UpdatePatient")]
    public async Task<ActionResult<PatientActionResultDto>> UpdatePatient(
        [FromBody] LegacyUpdatePatientDto dto, [FromServices] IPatientRecordService service)
        => this.ToActionResult(await service.UpdatePatientAsync(dto));

    [Authorize(Roles = "Admin")]
    [HttpGet("AuditLogs/ListAuditLogs")]
    public async Task<ActionResult<ServiceResult<PagedResult<AuditLogEntryDto>>>> ListAuditLogs(
        [FromQuery] AuditLogQueryDto query, [FromServices] IAuditLogQueryService service)
        => this.ToActionResult(await service.ListAsync(query));

    [Authorize(Roles = "Admin")]
    [HttpPost("Auth/CreateUser")]
    public async Task<ActionResult<CreateUserResultDto>> CreateUser(
        [FromBody] CreateUserDto dto, [FromServices] IUserCreationService service)
        => this.ToActionResult(await service.CreateUserAsync(dto));

    [Authorize(Roles = "FrontDesk,Admin,DemoAdmin,DemoFrontDesk")]
    [HttpGet("schedule/list-schedule")]
    public async Task<ActionResult<ServiceResult<List<ViewSchedule>>>> ListSchedules(
        [FromServices] IScheduleQueryService service)
        => this.ToActionResult(await service.ViewScheduleAsync());

    [Authorize(Roles = "Admin")]
    [HttpPost("schedule/create-schedule")]
    public async Task<ActionResult<CalendarActionResult>> CreateSchedule(
        [FromBody] CreateSchedule dto, [FromServices] IScheduleCreationService service)
        => this.ToActionResult(await service.CreateScheduleAsync(dto));

    [Authorize(Roles = "Admin")]
    [HttpPost("schedule/change-schedule")]
    public async Task<ActionResult<CalendarActionResult>> ChangeSchedule(
        [FromBody] LegacyChangeScheduleDto dto, [FromServices] IScheduleModificationService service)
        => this.ToActionResult(await service.ChangeScheduleAsync(dto));

    [Authorize(Roles = "FrontDesk,Admin,DemoAdmin,DemoFrontDesk")]
    [HttpGet("Department/ViewDepartment")]
    public async Task<ActionResult<ServiceResult<List<ViewDepartmentDto>>>> ListDepartments(
        [FromServices] IDepartmentQueryService service)
        => this.ToActionResult(await service.ListDepartmentsAsync());

    [Authorize(Roles = "Admin")]
    [HttpPost("Department/CreateDepartment")]
    public async Task<ActionResult<DepartmentActionResultDto>> CreateDepartment(
        [FromBody] CreateDepartmentDto dto, [FromServices] IDepartmentCreationService service)
        => this.ToActionResult(await service.CreateDepartmentAsync(dto));

    [Authorize(Roles = "Admin")]
    [HttpPost("Department/ChangeDepartmentStatus")]
    public async Task<ActionResult<DepartmentActionResultDto>> ChangeDepartmentStatus(
        [FromBody] LegacyChangeDepartmentStatusDto dto, [FromServices] IDepartmentStatusService service)
        => this.ToActionResult(await service.ChangeDepartmentStatusAsync(dto));

    [Authorize(Roles = "Admin")]
    [HttpPost("Department/ChangeDoctorDepartment")]
    public async Task<ActionResult<DepartmentActionResultDto>> ChangeDoctorDepartment(
        [FromBody] LegacyChangeDoctorDepartmentDto dto, [FromServices] IDoctorDepartmentService service)
        => this.ToActionResult(await service.ChangeDoctorDepartmentAsync(dto));

    [Authorize(Roles = "Admin")]
    [HttpGet("Users/ListUsers")]
    public async Task<ActionResult<ServiceResult<PagedResult<UserDisplayDto>>>> ListUsers(
        [FromQuery] UserQueryDto query, [FromServices] IUserQueryService service)
        => this.ToActionResult(await service.ListUsersAsync(query));

    [Authorize(Roles = "FrontDesk,Admin,DemoAdmin,DemoFrontDesk")]
    [HttpGet("Users/ListDoctors")]
    public async Task<ActionResult<ServiceResult<List<DoctorDisplayDto>>>> ListDoctors(
        [FromServices] IUserQueryService service)
        => this.ToActionResult(await service.ListDoctorsAsync());

    [Authorize(Roles = "Admin")]
    [HttpPost("Users/change-role")]
    public async Task<ActionResult<ChangeRoleResultDto>> ChangeRole(
        [FromBody] LegacyChangeRoleDto dto, [FromServices] IChangeRoleService service)
        => this.ToActionResult(await service.ChangeRoleAsync(dto));

    [Authorize(Roles = "Admin")]
    [HttpPost("Users/create-doctor")]
    public async Task<ActionResult<CreateDoctorResultDto>> CreateDoctor(
        [FromBody] CreateDoctorDto dto, [FromServices] ICreateDoctorService service)
        => this.ToActionResult(await service.CreateDoctorAsync(dto));

    [Authorize(Roles = "Admin")]
    [HttpPost("Users/change-doctor-status")]
    public async Task<ActionResult<ChangeDoctorsStatusResult>> ChangeDoctorStatus(
        [FromBody] LegacyChangeDoctorStatusDto dto, [FromServices] IDoctorStatusService service)
        => this.ToActionResult(await service.ChangeDoctorsStatusAsync(dto));

    [Authorize(Roles = "Admin")]
    [HttpPost("Users/reset-password")]
    public async Task<ActionResult<ResetPasswordResultDto>> ResetPassword(
        [FromBody] LegacyResetPasswordDto dto, [FromServices] IResetPasswordService service)
        => this.ToActionResult(await service.ResetPasswordAsync(dto));
}

// The new requests identify the target in the URL. Previous requests carried
// it in JSON. Re-expose that one property here; all other fields and their
// validation stay on the normal request DTO.
public sealed class LegacyCancelAppointmentDto : CancelAppointmentDto
{
    [JsonPropertyName("appointmentId")]
    public new int AppointmentId { get => base.AppointmentId; set => base.AppointmentId = value; }
}

public sealed class LegacyChangeAppointmentStatusDto : ChangeAppointmentStatusDto
{
    [JsonPropertyName("appointmentId")]
    public new int AppointmentId { get => base.AppointmentId; set => base.AppointmentId = value; }
}

public sealed class LegacyUpdatePatientDto : UpdatePatientDto
{
    [JsonPropertyName("patientId")]
    public new int PatientId { get => base.PatientId; set => base.PatientId = value; }
}

public sealed class LegacyChangeScheduleDto : ChangeScheduleDto
{
    [JsonPropertyName("scheduleId")]
    public new int ScheduleId { get => base.ScheduleId; set => base.ScheduleId = value; }
}

public sealed class LegacyChangeDepartmentStatusDto : ChangeDepartmentStatusDto
{
    [JsonPropertyName("departmentId")]
    public new int DepartmentId { get => base.DepartmentId; set => base.DepartmentId = value; }
}

public sealed class LegacyChangeDoctorDepartmentDto : ChangeDoctorDepartmentDto
{
    [JsonPropertyName("doctorId")]
    public new int DoctorId { get => base.DoctorId; set => base.DoctorId = value; }
}

public sealed class LegacyChangeRoleDto : ChangeRoleDto
{
    [JsonPropertyName("userId")]
    public new int UserId { get => base.UserId; set => base.UserId = value; }
}

public sealed class LegacyChangeDoctorStatusDto : ChangeDoctorStatusDto
{
    [JsonPropertyName("doctorId")]
    public new int DoctorId { get => base.DoctorId; set => base.DoctorId = value; }
}

public sealed class LegacyResetPasswordDto : ResetPasswordDto
{
    [JsonPropertyName("userId")]
    public new int UserId { get => base.UserId; set => base.UserId = value; }
}
