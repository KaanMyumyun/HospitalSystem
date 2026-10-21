using System.Security.Claims;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Auth;

namespace HospitalSystem.Services.Auth;

public class LoginService : ILoginService
{
    private readonly ApplicationDbContext _context;
    private readonly JwtSettings _jwtSettings;
    private readonly DemoSettings _demoSettings;
    private readonly IAuditLogService _auditLog;
    private readonly PasswordHasher<UserEntity> _hasher;

    private static readonly string DummyPasswordHash =
        new PasswordHasher<UserEntity>().HashPassword(new UserEntity(), Guid.NewGuid().ToString());

    public LoginService(
        ApplicationDbContext context,
        IOptions<JwtSettings> jwtOptions,
        IOptions<DemoSettings> demoOptions,
        IAuditLogService auditLog)
    {
        _context = context;
        _jwtSettings = jwtOptions.Value;
        _demoSettings = demoOptions.Value;
        _auditLog = auditLog;
        _hasher = new PasswordHasher<UserEntity>();
    }

    public async Task<LoginResultDto> LoginAsync(LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Password))
            return LoginResultDto.Fail("Invalid credentials");

        // Usernames ignore case: "Admin" and "admin" are the same account.
        var nameKey = dto.Name.Trim().ToLowerInvariant();
        var user = await _context.Users.SingleOrDefaultAsync(u => u.Name.ToLower() == nameKey);

        if (user == null)
        {
            _hasher.VerifyHashedPassword(new UserEntity(), DummyPasswordHash, dto.Password);
            return await RefuseAsync(null, "Failed sign-in with an unknown username");
        }

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
 
        if (result == PasswordVerificationResult.Failed)
            return await RefuseAsync(user, $"Failed sign-in for user {user.Name}: wrong password");

        if (user.Role is UserRole.DemoAdmin or UserRole.DemoFrontDesk)
            return await RefuseAsync(user, $"Failed sign-in for user {user.Name}: demo accounts have no password sign-in");

        // Only after the password check, so it does not reveal which usernames exist.
        if (user.Role == UserRole.Pending)
            return await RefuseAsync(user, $"Sign-in refused for user {user.Name}: account awaiting approval", "Account awaiting approval");

        var token = GenerateToken(user, _jwtSettings);

        return LoginResultDto.Success(token, user.Role);
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

        var nameKey = userName.ToLowerInvariant();
        var user = await _context.Users.SingleOrDefaultAsync(u => u.Name.ToLower() == nameKey && u.Role == role);

        if (user == null)
            return LoginResultDto.Fail("Invalid credentials");

        var token = GenerateToken(user, _jwtSettings);

        return LoginResultDto.Success(token, user.Role);
    }

    // Every refused password sign-in is audited. The typed username is kept
    // only when it names an account: people sometimes type a password there.
    private async Task<LoginResultDto> RefuseAsync(UserEntity? user, string details, string error = "Invalid credentials")
    {
        await _auditLog.LogAsync("SignInFailed", "User", user?.Id ?? 0, details);
        await _context.SaveChangesAsync();
        return LoginResultDto.Fail(error);
    }

    // Static so the startup warm-up can sign a throwaway token the same way.
    internal static string GenerateToken(UserEntity user, JwtSettings jwtSettings)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim(SecurityStampClaims.ClaimType, user.SecurityStamp)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: jwtSettings.Issuer,
            audience: jwtSettings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds
        );
 
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
