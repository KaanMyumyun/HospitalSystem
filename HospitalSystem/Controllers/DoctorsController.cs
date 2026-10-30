using HospitalSystem.Interfaces.Department;
using HospitalSystem.Interfaces.User;
using HospitalSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/doctors")]
public class DoctorsController : ControllerBase
{
    [Authorize(Policy = Access.ReferenceData)]
    [HttpGet]
    public async Task<ActionResult<ServiceResult<List<DoctorDisplayDto>>>> ListDoctors(
        [FromServices] IUserQueryService service, CancellationToken cancellationToken)
        => this.ToActionResult(await service.ListDoctorsAsync(cancellationToken));

    [Authorize(Policy = Access.Admin)]
    [HttpPost]
    public async Task<ActionResult<CreateDoctorResultDto>> CreateDoctor(
        [FromBody] CreateDoctorDto dto, [FromServices] ICreateDoctorService service, CancellationToken cancellationToken)
        => this.ToActionResult(await service.CreateDoctorAsync(dto, cancellationToken));

    [Authorize(Policy = Access.Admin)]
    [HttpPatch("{doctorId:int}/status")]
    public async Task<ActionResult<ChangeDoctorsStatusResult>> ChangeDoctorStatus(
        int doctorId, [FromBody] ChangeDoctorStatusDto dto, [FromServices] IDoctorStatusService service,
        CancellationToken cancellationToken)
    {
        dto.DoctorId = doctorId;
        return this.ToActionResult(await service.ChangeDoctorsStatusAsync(dto, cancellationToken));
    }

    [Authorize(Policy = Access.Admin)]
    [HttpPatch("{doctorId:int}/department")]
    public async Task<ActionResult<DepartmentActionResultDto>> ChangeDoctorDepartment(
        int doctorId, [FromBody] ChangeDoctorDepartmentDto dto, [FromServices] IDoctorDepartmentService service,
        CancellationToken cancellationToken)
    {
        dto.DoctorId = doctorId;
        return this.ToActionResult(await service.ChangeDoctorDepartmentAsync(dto, cancellationToken));
    }
}
