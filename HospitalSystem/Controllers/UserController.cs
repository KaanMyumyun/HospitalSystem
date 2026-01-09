using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext applicationDbContext;
    private readonly IAuthService _authService;
    public UsersController(ApplicationDbContext applicationDbContext, IAuthService authService)
    {
        this.applicationDbContext = applicationDbContext;
        _authService = authService;
    }

    [HttpPost("CreateUser")]
    public async Task<IActionResult> CreateUser([FromBody] UserDto dto)
    {

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        
        var hasher = new PasswordHasher<UserEntity>();

        var user = new UserEntity
        {
            Name = dto.Name,
            Role = dto.Role

        };

        user.PasswordHash = hasher.HashPassword(user, dto.Password);
        applicationDbContext.Users.Add(user);
        await applicationDbContext.SaveChangesAsync();

        return Ok(user);
    }

    [HttpPost("login")]
    public async Task<IActionResult> LogIn([FromBody] LoginDto dto)
    {
        if (dto == null|| string.IsNullOrWhiteSpace(dto.Name)||string.IsNullOrWhiteSpace(dto.Password))
        {
            return Unauthorized(LoginResultDto.Fail("Invalid Credentials"));
        }

        var user = await applicationDbContext.Users.FirstOrDefaultAsync(u => u.Name == dto.Name);
        if(user == null||string.IsNullOrWhiteSpace(user.Name))
        {
            return NotFound(LoginResultDto.Fail("User not found"));
        }
        if (string.IsNullOrWhiteSpace(user.PasswordHash))
{
    return Unauthorized(LoginResultDto.Fail("User password not set"));
}

        var hasher = new PasswordHasher<UserEntity>();
        var result = hasher.VerifyHashedPassword(user, user.PasswordHash,dto.Password);

         if(result == PasswordVerificationResult.Failed)
        {
            return  Unauthorized(LoginResultDto.Fail("User not found"));
        }    
      return Ok(LoginResultDto.Success(user.Role)) ;
    }

}