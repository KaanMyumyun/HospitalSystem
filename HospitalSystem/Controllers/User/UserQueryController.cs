using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HospitalSystem.Interfaces.User;
 
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
 
    [Authorize(Roles = "Admin")]
    [HttpGet("ListUsers")]
    public async Task<ActionResult<ServiceResult<PagedResult<UserDisplayDto>>>> ListUsers([FromQuery] UserQueryDto query)
        => this.ToActionResult(await _userQueryService.ListUsersAsync(query));
 
    [Authorize(Roles = "FrontDesk,Admin,DemoAdmin,DemoFrontDesk")]
    [HttpGet("ListDoctors")]
    public async Task<ActionResult<ServiceResult<List<DoctorDisplayDto>>>> ListDoctors()
        => this.ToActionResult(await _userQueryService.ListDoctorsAsync());
}
