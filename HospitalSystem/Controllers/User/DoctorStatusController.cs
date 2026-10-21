using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HospitalSystem.Interfaces.User;
 
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
    public async Task<ActionResult<ChangeDoctorsStatusResult>> ChangeDoctorStatus([FromBody] ChangeDoctorStatusDto dto)
        => this.ToActionResult(await _doctorStatusService.ChangeDoctorsStatusAsync(dto));
}
