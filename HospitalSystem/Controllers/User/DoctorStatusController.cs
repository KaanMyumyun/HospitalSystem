using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HospitalSystem.Interface.User;
 
namespace HospitalSystem.Controllers;
 
[ApiController]
[Route("api/Users")]
public class DoctorStatusController : ControllerBase
{
    private readonly IDoctorStatusService _doctorStatusService;
 
    public DoctorStatusController(IDoctorStatusService doctorStatusService)
    {
        _doctorStatusService = doctorStatusService;
    }
 
    [Authorize(Roles = "Admin")]
    [HttpPost("change-doctor-status")]
    public async Task<IActionResult> ChangeDoctorStatus([FromBody] ChangeDoctorsStatus dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
 
        var result = await _doctorStatusService.ChangeDoctorsStatusAsync(dto);
 
        if (!result.IsSuccess)
            return BadRequest(result);
 
        return Ok(result);
    }
}
