using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HospitalSystem.Interface.Department;
 
namespace HospitalSystem.Controllers;
 
[ApiController]
[Route("api/Department")]
public class DepartmentQueryController : ControllerBase
{
    private readonly IDepartmentQueryService _departmentQueryService;
 
    public DepartmentQueryController(IDepartmentQueryService departmentQueryService)
    {
        _departmentQueryService = departmentQueryService;
    }
 
    [Authorize(Roles = "FrontDesk,Admin,DemoAdmin,DemoFrontDesk")]
    [HttpGet("ViewDepartment")]
    public async Task<IActionResult> ListDepartments()
    {
        var result = await _departmentQueryService.ListDepartmentsAsync();
 
        if (!result.IsSuccess)
            return BadRequest(result);
 
        return Ok(result);
    }
}
