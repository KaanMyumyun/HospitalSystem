using HospitalSystem.Migrations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class DepartmentController :ControllerBase
{
private readonly IDepartmentService _departmentService;
public DepartmentController(IDepartmentService departmentService)
{
    _departmentService = departmentService;
}
    [HttpGet("ViewDepartment")]
    public async Task<ActionResult<List<ViewDepartmentDto>>> ListDeparments()
    {
        var departments = await _departmentService.ListDepartmentsAsync();
        return Ok(departments);
    }


    [HttpPost("CreateDepartment")]
    public async Task<IActionResult>CreateDepartment([FromBody] CreateDepartmentDto dto)
    {
         if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        
        DepartmentActionResultDto result = await _departmentService.CreateDepartmentAsync(dto);
        if(!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);

    }

    [HttpPost("ChangeDoctorDepartment")]
    public async Task<IActionResult>ChangeDoctorDepartment([FromBody] ChangeDoctorDepartmentDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        
        DepartmentActionResultDto result = await _departmentService.ChangeDoctorDepartmentAsync(dto);
        if(!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);

    }

    [HttpPost("ChangeDepartmentStatus")]
    public async Task<IActionResult>ChangeDepartmentStatus([FromBody] ChangeDepartmentStatusDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        
        DepartmentActionResultDto result = await _departmentService.ChangeDepartmentStatusAsync(dto);
        if(!result.IsSuccess)
        {
            return BadRequest(result);
        }
        return Ok(result);

    }

}
