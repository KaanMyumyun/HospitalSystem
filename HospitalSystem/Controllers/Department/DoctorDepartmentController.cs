using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HospitalSystem.Interfaces.Department;
 
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
    public async Task<ActionResult<DepartmentActionResultDto>> ChangeDoctorDepartment([FromBody] ChangeDoctorDepartmentDto dto)
        => this.ToActionResult(await _doctorDepartmentService.ChangeDoctorDepartmentAsync(dto));
}
    