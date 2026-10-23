using HospitalSystem.Interfaces.Department;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/departments")]
public class DepartmentsController : ControllerBase
{
    [Authorize(Roles = "FrontDesk,Admin,DemoAdmin,DemoFrontDesk")]
    [HttpGet]
    public async Task<ActionResult<ServiceResult<List<ViewDepartmentDto>>>> ListDepartments(
        [FromServices] IDepartmentQueryService service)
        => this.ToActionResult(await service.ListDepartmentsAsync());

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<DepartmentActionResultDto>> CreateDepartment(
        [FromBody] CreateDepartmentDto dto, [FromServices] IDepartmentCreationService service)
        => this.ToActionResult(await service.CreateDepartmentAsync(dto));

    [Authorize(Roles = "Admin")]
    [HttpPatch("{departmentId:int}/status")]
    public async Task<ActionResult<DepartmentActionResultDto>> ChangeDepartmentStatus(
        int departmentId, [FromBody] ChangeDepartmentStatusDto dto, [FromServices] IDepartmentStatusService service)
    {
        dto.DepartmentId = departmentId;
        return this.ToActionResult(await service.ChangeDepartmentStatusAsync(dto));
    }
}
