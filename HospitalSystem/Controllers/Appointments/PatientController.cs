using HospitalSystem.Interfaces.Appointments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/Patients")]
public class PatientController : ControllerBase
{
    private readonly IPatientRecordService _patientRecordService;

    public PatientController(IPatientRecordService patientRecordService)
    {
        _patientRecordService = patientRecordService;
    }

    [Authorize(Roles = "FrontDesk,DemoFrontDesk")]
    [HttpGet("ListPatients")]
    public async Task<ActionResult<ServiceResult<PagedResult<PatientSummaryDto>>>> ListPatients([FromQuery] PatientQueryDto query)
        => this.ToActionResult(await _patientRecordService.ListPatientsAsync(query));

    [Authorize(Roles = "FrontDesk,DemoFrontDesk")]
    [HttpGet("{patientId:int}")]
    public async Task<ActionResult<ServiceResult<PatientDetailsDto>>> GetPatient(int patientId)
        => this.ToActionResult(await _patientRecordService.GetPatientAsync(patientId));

    [Authorize(Roles = "FrontDesk")]
    [HttpPost("UpdatePatient")]
    public async Task<ActionResult<PatientActionResultDto>> UpdatePatient([FromBody] UpdatePatientDto dto)
        => this.ToActionResult(await _patientRecordService.UpdatePatientAsync(dto));
}
