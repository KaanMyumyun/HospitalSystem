using System.Security.Claims;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using HospitalSystem.Interfaces.Auth;

namespace HospitalSystem.Services.Auth;

public class LoginService : ILoginService
{
    private readonly ApplicationDbContext _context;
    private readonly JwtSettings _jwtSettings;
    private readonly DemoSettings _demoSettings;
    private readonly PasswordHasher<UserEntity> _hasher;

    private static readonly string DummyPasswordHash =
        new PasswordHasher<UserEntity>().HashPassword(new UserEntity(), Guid.NewGuid().ToString());

    public LoginService(ApplicationDbContext context, IOptions<JwtSettings> jwtOptions, IOptions<DemoSettings> demoOptions)
    {
        _context = context;
        _jwtSettings = jwtOptions.Value;
        _demoSettings = demoOptions.Value;
        _hasher = new PasswordHasher<UserEntity>();
    }

    public async Task<LoginResultDto> LoginAsync(LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Password))
            return LoginResultDto.Fail("Invalid credentials");

        var user = await _context.Users.SingleOrDefaultAsync(u => u.Name == dto.Name);

        if (user == null)
        {
            _hasher.VerifyHashedPassword(new UserEntity(), DummyPasswordHash, dto.Password);
            return LoginResultDto.Fail("Invalid credentials");
        }

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
 
        if (result == PasswordVerificationResult.Failed)
            return LoginResultDto.Fail("Invalid credentials");

        if (user.Role is UserRole.DemoAdmin or UserRole.DemoFrontDesk)
            return LoginResultDto.Fail("Invalid credentials");

        // Only after the password check, so it does not reveal which usernames exist.
        if (user.Role == UserRole.Pending)
            return LoginResultDto.Fail("Account awaiting approval");

        var token = GenerateToken(user);

        return LoginResultDto.Success(token, user.Role.ToString());
    }

    public async Task<LoginResultDto> DemoLoginAsync(UserRole role)
    {
        if (!_demoSettings.Enabled)
            return LoginResultDto.Fail("Demo login is not available");

        var userName = role switch
        {
            UserRole.DemoAdmin => _demoSettings.AdminUserName,
            UserRole.DemoFrontDesk => _demoSettings.FrontDeskUserName,
            _ => null
        };

        if (string.IsNullOrWhiteSpace(userName))
            return LoginResultDto.Fail("Invalid credentials");

        var user = await _context.Users.SingleOrDefaultAsync(u => u.Name == userName && u.Role == role);

        if (user == null)
            return LoginResultDto.Fail("Invalid credentials");

        var token = GenerateToken(user);

        return LoginResultDto.Success(token, user.Role.ToString());
    }

    private string GenerateToken(UserEntity user)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim(SecurityStampClaims.ClaimType, user.SecurityStamp)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds
        );
 
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
