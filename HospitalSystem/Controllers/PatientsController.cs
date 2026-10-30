using HospitalSystem.Interfaces.Appointments;
using HospitalSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/patients")]
public class PatientsController : ControllerBase
{
    [Authorize(Policy = Access.DeskReads)]
    [HttpGet]
    public async Task<ActionResult<ServiceResult<PagedResult<PatientSummaryDto>>>> ListPatients(
        [FromQuery] PatientQueryDto query, [FromServices] IPatientRecordService service, CancellationToken cancellationToken)
        => this.ToActionResult(await service.ListPatientsAsync(query, cancellationToken));

    [Authorize(Policy = Access.DeskReads)]
    [HttpGet("{patientId:int}")]
    public async Task<ActionResult<ServiceResult<PatientDetailsDto>>> GetPatient(
        int patientId, [FromServices] IPatientRecordService service, CancellationToken cancellationToken)
        => this.ToActionResult(await service.GetPatientAsync(patientId, cancellationToken));

    [Authorize(Policy = Access.Desk)]
    [HttpPut("{patientId:int}")]
    public async Task<ActionResult<PatientActionResultDto>> UpdatePatient(
        int patientId, [FromBody] UpdatePatientDto dto, [FromServices] IPatientRecordService service,
        CancellationToken cancellationToken)
    {
        dto.PatientId = patientId;
        return this.ToActionResult(await service.UpdatePatientAsync(dto, cancellationToken));
    }
}
