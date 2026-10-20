using Microsoft.AspNetCore.Identity;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.User;
using HospitalSystem.Services.Auth;
 
namespace HospitalSystem.Services.User;
 
public class ResetPasswordService : IResetPasswordService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly PasswordHasher<UserEntity> _hasher;
    private readonly IAuditLogService _auditLog;
    private readonly SecurityStampCache _stamps;
 
    public ResetPasswordService(ApplicationDbContext context, ICurrentUserService currentUser, IAuditLogService auditLog, SecurityStampCache stamps)
    {
        _context = context;
        _currentUser = currentUser;
        _auditLog = auditLog;
        _stamps = stamps;
        _hasher = new PasswordHasher<UserEntity>();
    }
 
    public async Task<ResetPasswordResultDto> ResetPasswordAsync(ResetPasswordDto dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return ResetPasswordResultDto.Fail("You are not allowed to reset password");
 
        if (string.IsNullOrWhiteSpace(dto.NewPassword))
            return ResetPasswordResultDto.Fail("No password entered");

        if (dto.NewPassword.Length < 8)
            return ResetPasswordResultDto.Fail("Password must be at least 8 characters long");
 
        var user = await _context.Users.FindAsync(dto.UserId);
        if (user == null)
            return ResetPasswordResultDto.Fail("User not found");
 
        user.PasswordHash = _hasher.HashPassword(user, dto.NewPassword);
        user.SecurityStamp = Guid.NewGuid().ToString();
        await _auditLog.LogAsync(
            "ResetPassword",
            "User",
            user.Id,
            $"Password reset for user {user.Name}");
        await _context.SaveChangesAsync();
        _stamps.Forget(user.Id);
 
        return ResetPasswordResultDto.Success();
    }
}
