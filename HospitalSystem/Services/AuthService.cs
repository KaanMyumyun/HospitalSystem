using System.Reflection.Metadata.Ecma335;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

public class AuthService : IAuthService
{
    private readonly PasswordHasher<UserEntity> _hasher;
    private readonly ApplicationDbContext _context;
    public AuthService(ApplicationDbContext context)
    {
        _context = context;
        _hasher = new PasswordHasher<UserEntity>();
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

        // 🔐 Rehash if needed
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _hasher.HashPassword(user, dto.Password);
            await _context.SaveChangesAsync();
        }

        return LoginResultDto.Success(user.Role);    }
}