using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HospitalSystem.Interfaces.Department;
 
namespace HospitalSystem.Controllers;
 
[ApiController]
[Route("api/Department")]
public class DepartmentCreationController : ControllerBase
{
    private readonly IDepartmentCreationService _departmentCreationService;
 
    public DepartmentCreationController(IDepartmentCreationService departmentCreationService)
    {
        _departmentCreationService = departmentCreationService;
    }
 
    [Authorize(Roles = "Admin")]
    [HttpPost("CreateDepartment")]
    public async Task<ActionResult<DepartmentActionResultDto>> CreateDepartment([FromBody] CreateDepartmentDto dto)
        => this.ToActionResult(await _departmentCreationService.CreateDepartmentAsync(dto));
}
