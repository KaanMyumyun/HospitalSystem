using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HospitalSystem.Interface.User;
 
namespace HospitalSystem.Controllers;
 
[ApiController]
[Route("api/Users")]
public class ChangeRoleController : ControllerBase
{
    private readonly IChangeRoleService _changeRoleService;
 
    public ChangeRoleController(IChangeRoleService changeRoleService)
    {
        _changeRoleService = changeRoleService;
    }
 
    [Authorize(Roles = "Admin")]
    [HttpPost("change-role")]
    public async Task<IActionResult> ChangeRole([FromBody] ChangeRoleDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
 
        var result = await _changeRoleService.ChangeRoleAsync(dto);
 
        if (!result.IsSuccess)
            return BadRequest(result);
 
        return Ok(result);
    }
}
