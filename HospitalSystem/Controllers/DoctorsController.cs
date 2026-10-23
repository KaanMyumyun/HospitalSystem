using HospitalSystem.Interfaces.Department;
using HospitalSystem.Interfaces.User;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/doctors")]
public class DoctorsController : ControllerBase
{
    [Authorize(Roles = "FrontDesk,Admin,DemoAdmin,DemoFrontDesk")]
    [HttpGet]
    public async Task<ActionResult<ServiceResult<List<DoctorDisplayDto>>>> ListDoctors([FromServices] IUserQueryService service)
        => this.ToActionResult(await service.ListDoctorsAsync());

    // Makes a pending user, or a former doctor, a doctor in a department.
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<CreateDoctorResultDto>> CreateDoctor(
        [FromBody] CreateDoctorDto dto, [FromServices] ICreateDoctorService service)
        => this.ToActionResult(await service.CreateDoctorAsync(dto));

    [Authorize(Roles = "Admin")]
    [HttpPatch("{doctorId:int}/status")]
    public async Task<ActionResult<ChangeDoctorsStatusResult>> ChangeDoctorStatus(
        int doctorId, [FromBody] ChangeDoctorStatusDto dto, [FromServices] IDoctorStatusService service)
    {
        dto.DoctorId = doctorId;
        return this.ToActionResult(await service.ChangeDoctorsStatusAsync(dto));
    }

    [Authorize(Roles = "Admin")]
    [HttpPatch("{doctorId:int}/department")]
    public async Task<ActionResult<DepartmentActionResultDto>> ChangeDoctorDepartment(
        int doctorId, [FromBody] ChangeDoctorDepartmentDto dto, [FromServices] IDoctorDepartmentService service)
    {
        dto.DoctorId = doctorId;
        return this.ToActionResult(await service.ChangeDoctorDepartmentAsync(dto));
    }
}
