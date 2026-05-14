using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HospitalSystem.Interface.User;
 
namespace HospitalSystem.Controllers;
 
[ApiController]
[Route("api/Users")]
public class UserQueryController : ControllerBase
{
    private readonly IUserQueryService _userQueryService;
 
    public UserQueryController(IUserQueryService userQueryService)
    {
        _userQueryService = userQueryService;
    }
 
    [Authorize(Roles = "FrontDesk,Admin,DemoAdmin,DemoFrontDesk")]
    [HttpGet("ListUsers")]
    public async Task<IActionResult> ListUsers()
    {
        var result = await _userQueryService.ListUsersAsync();
 
        if (!result.IsSuccess)
            return BadRequest(result);
 
        return Ok(result);
    }
 
    [Authorize(Roles = "FrontDesk,Admin,DemoAdmin,DemoFrontDesk")]
    [HttpGet("ListDoctors")]
    public async Task<IActionResult> ListDoctors()
    {
        var result = await _userQueryService.ListDoctorsAsync();
 
        if (!result.IsSuccess)
            return BadRequest(result);
 
        return Ok(result);
    }
}
