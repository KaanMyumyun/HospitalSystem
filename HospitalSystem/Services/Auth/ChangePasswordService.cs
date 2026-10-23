using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HospitalSystem.Services.Auth;

// A signed-in user changes their own password. Like an admin's reset, it
// signs out the user's other sessions; this one gets a new token.
public class ChangePasswordService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog,
    SecurityStampCache stamps,
    IOptions<JwtSettings> jwtOptions,
    IPasswordHasher<UserEntity> hasher,
    TimeProvider clock) : IChangePasswordService
{
    private readonly JwtSettings _jwtSettings = jwtOptions.Value;

    public async Task<ChangePasswordResultDto> ChangeOwnPasswordAsync(ChangePasswordDto dto)
    {
        if (currentUser.IsDemo())
            return ChangePasswordResultDto.Forbidden("Demo accounts have no password to change");

        if (!int.TryParse(currentUser.UserId, out var userId))
            return ChangePasswordResultDto.Forbidden("Sign in to change your password");

        if (dto.NewPassword.Length < 8)
            return ChangePasswordResultDto.Fail("Password must be at least 8 characters long");

        if (dto.NewPassword == dto.CurrentPassword)
            return ChangePasswordResultDto.Fail("The new password must be different from the current one");

        await using var transaction = context.Database.IsNpgsql()
            ? await context.Database.BeginTransactionAsync()
            : null;
        var result = await ChangeOwnPasswordWithLockedUserAsync(dto, userId);
        if (transaction is not null)
            await transaction.CommitAsync();
        if (result.IsSuccess)
            stamps.Forget(userId);
        return result;
    }

    private async Task<ChangePasswordResultDto> ChangeOwnPasswordWithLockedUserAsync(ChangePasswordDto dto, int userId)
    {
        var user = await SignInLockout.FindByIdForUpdateAsync(context, userId);
        if (user is null)
            return ChangePasswordResultDto.NotFound("User not found");

        // A stolen session must not be a way around the sign-in lock, so wrong
        // current passwords count towards it too.
        var now = clock.GetUtcNow().UtcDateTime;
        if (SignInLockout.IsLocked(user, now))
            return ChangePasswordResultDto.Fail(SignInLockout.LockedMessage(user, now));

        if (hasher.VerifyHashedPassword(user, user.PasswordHash, dto.CurrentPassword) == PasswordVerificationResult.Failed)
        {
            await auditLog.LogAsync("ChangePasswordFailed", "User", user.Id, $"User {user.Name} gave a wrong current password");
            var locked = SignInLockout.RecordFailure(user, now);
            if (locked)
                await auditLog.LogAsync("SignInLocked", "User", user.Id, SignInLockout.LockedAuditDetails(user));
            await context.SaveChangesAsync();
            return ChangePasswordResultDto.Fail(locked ? SignInLockout.LockedMessage(user, now) : "The current password is not correct");
        }

        SignInLockout.Clear(user);
        user.PasswordHash = hasher.HashPassword(user, dto.NewPassword);
        user.SecurityStamp = Guid.NewGuid().ToString();
        await auditLog.LogAsync("ChangePassword", "User", user.Id, $"User {user.Name} changed their password");
        await context.SaveChangesAsync();

        var result = ChangePasswordResultDto.Success();
        result.Token = LoginService.GenerateToken(user, _jwtSettings);
        return result;
    }
}
