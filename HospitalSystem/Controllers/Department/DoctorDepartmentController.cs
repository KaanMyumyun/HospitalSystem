using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HospitalSystem.Interface.Department;
 
namespace HospitalSystem.Controllers;
 
[ApiController]
[Route("api/Department")]
public class DoctorDepartmentController : ControllerBase
{
    private readonly IDoctorDepartmentService _doctorDepartmentService;
 
    public DoctorDepartmentController(IDoctorDepartmentService doctorDepartmentService)
    {
        _doctorDepartmentService = doctorDepartmentService;
    }
 
    [Authorize(Roles = "Admin")]
    [HttpPost("ChangeDoctorDepartment")]
    public async Task<IActionResult> ChangeDoctorDepartment([FromBody] ChangeDoctorDepartmentDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
 
        var result = await _doctorDepartmentService.ChangeDoctorDepartmentAsync(dto);
 
        if (!result.IsSuccess)
            return BadRequest(result);
 
        return Ok(result);
    }
}
    