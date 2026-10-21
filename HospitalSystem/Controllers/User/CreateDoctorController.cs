using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HospitalSystem.Interfaces.User;
 
namespace HospitalSystem.Controllers;
 
[ApiController]
[Route("api/Users")]
public class CreateDoctorController : ControllerBase
{
    private readonly ICreateDoctorService _createDoctorService;
 
    public CreateDoctorController(ICreateDoctorService createDoctorService)
    {
        _createDoctorService = createDoctorService;
    }
 
    [Authorize(Roles = "Admin")]
    [HttpPost("create-doctor")]
    public async Task<ActionResult<CreateDoctorResultDto>> CreateDoctor([FromBody] CreateDoctorDto dto)
        => this.ToActionResult(await _createDoctorService.CreateDoctorAsync(dto));
}
