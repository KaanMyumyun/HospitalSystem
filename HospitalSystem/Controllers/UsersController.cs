using HospitalSystem.Interfaces.Auth;
using HospitalSystem.Interfaces.User;
using HospitalSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Policy = Access.Admin)]
public class UsersController : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ServiceResult<PagedResult<UserDisplayDto>>>> ListUsers(
        [FromQuery] UserQueryDto query, [FromServices] IUserQueryService service, CancellationToken cancellationToken)
        => this.ToActionResult(await service.ListUsersAsync(query, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<CreateUserResultDto>> CreateUser(
        [FromBody] CreateUserDto dto, [FromServices] IUserCreationService service, CancellationToken cancellationToken)
        => this.ToActionResult(await service.CreateUserAsync(dto, cancellationToken));

    [HttpPatch("{userId:int}/role")]
    public async Task<ActionResult<ChangeRoleResultDto>> ChangeRole(
        int userId, [FromBody] ChangeRoleDto dto, [FromServices] IChangeRoleService service, CancellationToken cancellationToken)
    {
        dto.UserId = userId;
        return this.ToActionResult(await service.ChangeRoleAsync(dto, cancellationToken));
    }

    [HttpPut("{userId:int}/password")]
    public async Task<ActionResult<ResetPasswordResultDto>> ResetPassword(
        int userId, [FromBody] ResetPasswordDto dto, [FromServices] IResetPasswordService service,
        CancellationToken cancellationToken)
    {
        dto.UserId = userId;
        return this.ToActionResult(await service.ResetPasswordAsync(dto, cancellationToken));
    }
}
