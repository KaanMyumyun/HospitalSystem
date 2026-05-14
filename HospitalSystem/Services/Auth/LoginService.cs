using System.Security.Claims;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using HospitalSystem.Interface.Auth;

public class LoginService : ILoginService
{
    private readonly ApplicationDbContext _context;
    private readonly JwtSettings _jwtSettings;
    private readonly PasswordHasher<UserEntity> _hasher;
 
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
            return LoginResultDto.Fail("Invalid credentials");
 
        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
 
        if (result == PasswordVerificationResult.Failed)
            return LoginResultDto.Fail("Invalid credentials");
 
        var token = GenerateToken(user);
 
        return LoginResultDto.Success(token, user.Role.ToString());
    }
 
    private string GenerateToken(UserEntity user)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };
 
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
 
        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(3),
            signingCredentials: creds
        );
 
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
