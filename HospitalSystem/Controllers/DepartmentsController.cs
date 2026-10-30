using HospitalSystem.Interfaces.Department;
using HospitalSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/departments")]
public class DepartmentsController : ControllerBase
{
    [Authorize(Policy = Access.ReferenceData)]
    [HttpGet]
    public async Task<ActionResult<ServiceResult<List<ViewDepartmentDto>>>> ListDepartments(
        [FromServices] IDepartmentQueryService service, CancellationToken cancellationToken)
        => this.ToActionResult(await service.ListDepartmentsAsync(cancellationToken));

    [Authorize(Policy = Access.Admin)]
    [HttpPost]
    public async Task<ActionResult<DepartmentActionResultDto>> CreateDepartment(
        [FromBody] CreateDepartmentDto dto, [FromServices] IDepartmentCreationService service,
        CancellationToken cancellationToken)
        => this.ToActionResult(await service.CreateDepartmentAsync(dto, cancellationToken));

    [Authorize(Policy = Access.Admin)]
    [HttpPatch("{departmentId:int}/status")]
    public async Task<ActionResult<DepartmentActionResultDto>> ChangeDepartmentStatus(
        int departmentId, [FromBody] ChangeDepartmentStatusDto dto, [FromServices] IDepartmentStatusService service,
        CancellationToken cancellationToken)
    {
        dto.DepartmentId = departmentId;
        return this.ToActionResult(await service.ChangeDepartmentStatusAsync(dto, cancellationToken));
    }
}
