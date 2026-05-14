using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HospitalSystem.Interface.Department;
 
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
    public async Task<IActionResult> CreateDepartment([FromBody] CreateDepartmentDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
 
        var result = await _departmentCreationService.CreateDepartmentAsync(dto);
 
        if (!result.IsSuccess)
            return BadRequest(result);
 
        return Ok(result);
    }
}
