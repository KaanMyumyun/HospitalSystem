using HospitalSystem.Interfaces.Appointments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/patients")]
public class PatientsController : ControllerBase
{
    [Authorize(Roles = "FrontDesk,DemoFrontDesk")]
    [HttpGet]
    public async Task<ActionResult<ServiceResult<PagedResult<PatientSummaryDto>>>> ListPatients(
        [FromQuery] PatientQueryDto query, [FromServices] IPatientRecordService service)
        => this.ToActionResult(await service.ListPatientsAsync(query));

    [Authorize(Roles = "FrontDesk,DemoFrontDesk")]
    [HttpGet("{patientId:int}")]
    public async Task<ActionResult<ServiceResult<PatientDetailsDto>>> GetPatient(
        int patientId, [FromServices] IPatientRecordService service)
        => this.ToActionResult(await service.GetPatientAsync(patientId));

    // Replaces the name, phone number and date of birth.
    [Authorize(Roles = "FrontDesk")]
    [HttpPut("{patientId:int}")]
    public async Task<ActionResult<PatientActionResultDto>> UpdatePatient(
        int patientId, [FromBody] UpdatePatientDto dto, [FromServices] IPatientRecordService service)
    {
        dto.PatientId = patientId;
        return this.ToActionResult(await service.UpdatePatientAsync(dto));
    }
}
