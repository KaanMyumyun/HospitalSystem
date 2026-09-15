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
    private readonly PasswordHasher<UserEntity> _hasher;

    // A fixed, valid-format hash to verify against when the user doesn't exist,
    // so a missing username takes the same time as a wrong password (no
    // user-enumeration timing oracle). The hashed value itself is irrelevant.
    private static readonly string DummyPasswordHash =
        new PasswordHasher<UserEntity>().HashPassword(new UserEntity(), Guid.NewGuid().ToString());

    public LoginService(ApplicationDbContext context, IOptions<JwtSettings> jwtOptions)
    {
        _context = context;
        _jwtSettings = jwtOptions.Value;
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
 
        var token = GenerateToken(user);

        return LoginResultDto.Success(token, user.Role.ToString());
    }

    public async Task<LoginResultDto> DemoLoginAsync(UserRole role)
    {
        if (role != UserRole.DemoAdmin && role != UserRole.DemoFrontDesk)
            return LoginResultDto.Fail("Invalid credentials");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Role == role);

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
            // Shortened from 3 hours: the security-stamp check below now
            // revokes tokens immediately on role change/password
            // reset/doctor-disable, but a shorter window still limits
            // exposure for a leaked token whose triggering account never
            // changes. Full refresh-token rotation is a bigger feature
            // (new endpoint, storage, frontend silent-refresh UX) and is
            // not implemented here.
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds
        );
 
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
