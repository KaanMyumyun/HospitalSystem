using System.Reflection.Metadata.Ecma335;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Options;


public class AuthService : IAuthService
{
    private readonly PasswordHasher<UserEntity> _hasher;
    private readonly ApplicationDbContext _context;
    private readonly JwtSettings _jwtSettings;
   public AuthService(ApplicationDbContext context,IOptions<JwtSettings> jwtOptions)
{
    _context = context;
    _hasher = new PasswordHasher<UserEntity>();
    _jwtSettings = jwtOptions.Value;
}
 public async Task<LoginResultDto> LoginAsync(LoginDto dto)
{
    if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Password))
    {
        return LoginResultDto.Fail("Invalid credentials");
    }

    var user = await _context.Users
        .SingleOrDefaultAsync(u => u.Name == dto.Name);

    if (user == null)
    {
        return LoginResultDto.Fail("Invalid credentials");
    }

    
    var result = _hasher.VerifyHashedPassword(
        user,
        user.PasswordHash,
        dto.Password
    );

    if (result == PasswordVerificationResult.Failed)
    {
        return LoginResultDto.Fail("Invalid credentials");
    }

    var claims = new List<Claim>
    {
        new Claim("UserId", user.Id.ToString()), 
        new Claim(ClaimTypes.Role, user.Role.ToString())
    };

    var key = new SymmetricSecurityKey(
        Encoding.UTF8.GetBytes(_jwtSettings.SecretKey)
    );

    var creds = new SigningCredentials(
        key,
        SecurityAlgorithms.HmacSha256
    );

    var token = new JwtSecurityToken(
        issuer: _jwtSettings.Issuer,
        audience: _jwtSettings.Audience,
        claims: claims,
        expires: DateTime.UtcNow.AddHours(3),
        signingCredentials: creds
    );

    var tokenString = new JwtSecurityTokenHandler()
        .WriteToken(token);

    return LoginResultDto.Success(tokenString, user.Role.ToString());
}


    public async Task<CreateUserResultDto> CreateUser(CreateUserDto dto)
    {
        
        if(string.IsNullOrWhiteSpace(dto.Name)||string.IsNullOrWhiteSpace(dto.Password))
        {
            return CreateUserResultDto.Fail("InvalidCredential");
        }

        var exist = await _context.Users.AnyAsync(u => u.Name == dto.Name);

        if(exist)
        {
            return CreateUserResultDto.Fail("Name already exists");
        } 
        
        var hasher = new PasswordHasher<UserEntity>();

        var user = new UserEntity
        {
            Name = dto.Name,
            Role = UserRole.Pending
        };



        user.PasswordHash = hasher.HashPassword(user, dto.Password);
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return CreateUserResultDto.Success();
    }
}

