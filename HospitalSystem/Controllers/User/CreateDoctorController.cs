using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HospitalSystem.Interface.User;
 
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
    public async Task<IActionResult> CreateDoctor([FromBody] CreateDoctorDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
 
        var result = await _createDoctorService.CreateDoctorAsync(dto);
 
        if (!result.IsSuccess)
            return BadRequest(result);
 
        return Ok(result);
    }
}
