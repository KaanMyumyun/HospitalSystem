using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace HospitalSystem.Services.Auth;

// A signed-in user changes their own password. Like an admin's reset, it
// signs out the user's other sessions; this one gets a new token.
public class ChangePasswordService : IChangePasswordService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;
    private readonly SecurityStampCache _stamps;
    private readonly JwtSettings _jwtSettings;
    private readonly PasswordHasher<UserEntity> _hasher = new();

    public ChangePasswordService(
        ApplicationDbContext context,
        ICurrentUserService currentUser,
        IAuditLogService auditLog,
        SecurityStampCache stamps,
        IOptions<JwtSettings> jwtOptions)
    {
        _context = context;
        _currentUser = currentUser;
        _auditLog = auditLog;
        _stamps = stamps;
        _jwtSettings = jwtOptions.Value;
    }

    public async Task<ChangePasswordResultDto> ChangeOwnPasswordAsync(ChangePasswordDto dto)
    {
        if (_currentUser.IsInRole(UserRole.DemoAdmin) || _currentUser.IsInRole(UserRole.DemoFrontDesk))
            return ChangePasswordResultDto.Forbidden("Demo accounts have no password to change");

        if (!int.TryParse(_currentUser.UserId, out var userId))
            return ChangePasswordResultDto.Forbidden("Sign in to change your password");

        if (dto.NewPassword.Length < 8)
            return ChangePasswordResultDto.Fail("Password must be at least 8 characters long");

        if (dto.NewPassword == dto.CurrentPassword)
            return ChangePasswordResultDto.Fail("The new password must be different from the current one");

        var user = await _context.Users.FindAsync(userId);
        if (user is null)
            return ChangePasswordResultDto.NotFound("User not found");

        if (_hasher.VerifyHashedPassword(user, user.PasswordHash, dto.CurrentPassword) == PasswordVerificationResult.Failed)
        {
            await _auditLog.LogAsync("ChangePasswordFailed", "User", user.Id, $"User {user.Name} gave a wrong current password");
            await _context.SaveChangesAsync();
            return ChangePasswordResultDto.Fail("The current password is not correct");
        }

        user.PasswordHash = _hasher.HashPassword(user, dto.NewPassword);
        user.SecurityStamp = Guid.NewGuid().ToString();
        await _auditLog.LogAsync("ChangePassword", "User", user.Id, $"User {user.Name} changed their password");
        await _context.SaveChangesAsync();
        _stamps.Forget(user.Id);

        var result = ChangePasswordResultDto.Success();
        result.Token = LoginService.GenerateToken(user, _jwtSettings);
        return result;
    }
}
