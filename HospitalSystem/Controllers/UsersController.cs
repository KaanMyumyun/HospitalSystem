using HospitalSystem.Interfaces.Auth;
using HospitalSystem.Interfaces.User;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ServiceResult<PagedResult<UserDisplayDto>>>> ListUsers(
        [FromQuery] UserQueryDto query, [FromServices] IUserQueryService service)
        => this.ToActionResult(await service.ListUsersAsync(query));

    [HttpPost]
    public async Task<ActionResult<CreateUserResultDto>> CreateUser(
        [FromBody] CreateUserDto dto, [FromServices] IUserCreationService service)
        => this.ToActionResult(await service.CreateUserAsync(dto));

    [HttpPatch("{userId:int}/role")]
    public async Task<ActionResult<ChangeRoleResultDto>> ChangeRole(
        int userId, [FromBody] ChangeRoleDto dto, [FromServices] IChangeRoleService service)
    {
        dto.UserId = userId;
        return this.ToActionResult(await service.ChangeRoleAsync(dto));
    }

    [HttpPut("{userId:int}/password")]
    public async Task<ActionResult<ResetPasswordResultDto>> ResetPassword(
        int userId, [FromBody] ResetPasswordDto dto, [FromServices] IResetPasswordService service)
    {
        dto.UserId = userId;
        return this.ToActionResult(await service.ResetPasswordAsync(dto));
    }
}
