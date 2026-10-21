using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HospitalSystem.Interfaces.Department;
 
namespace HospitalSystem.Controllers;
 
[ApiController]
[Route("api/Department")]
public class DepartmentStatusController : ControllerBase
{
    private readonly IDepartmentStatusService _departmentStatusService;
 
    public DepartmentStatusController(IDepartmentStatusService departmentStatusService)
    {
        _departmentStatusService = departmentStatusService;
    }
 
    [Authorize(Roles = "Admin")]
    [HttpPost("ChangeDepartmentStatus")]
    public async Task<ActionResult<DepartmentActionResultDto>> ChangeDepartmentStatus([FromBody] ChangeDepartmentStatusDto dto)
        => this.ToActionResult(await _departmentStatusService.ChangeDepartmentStatusAsync(dto));
}
