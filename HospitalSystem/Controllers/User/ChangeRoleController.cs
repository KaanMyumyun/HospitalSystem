using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HospitalSystem.Interfaces.User;
 
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
    public async Task<ActionResult<ChangeRoleResultDto>> ChangeRole([FromBody] ChangeRoleDto dto)
        => this.ToActionResult(await _changeRoleService.ChangeRoleAsync(dto));
}
