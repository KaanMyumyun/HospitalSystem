using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HospitalSystem.Interface.Department;
 
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
    public async Task<IActionResult> ChangeDepartmentStatus([FromBody] ChangeDepartmentStatusDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
 
        var result = await _departmentStatusService.ChangeDepartmentStatusAsync(dto);
 
        if (!result.IsSuccess)
            return BadRequest(result);
 
        return Ok(result);
    }
}
