using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.User;
using HospitalSystem.Services.Auth;

namespace HospitalSystem.Services.User;

public class ResetPasswordService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog,
    SecurityStampCache stamps,
    IPasswordHasher<UserEntity> hasher) : IResetPasswordService
{
    public async Task<ResetPasswordResultDto> ResetPasswordAsync(ResetPasswordDto dto)
    {
        if (currentUser.RequireAdmin<ResetPasswordResultDto>("reset a password") is { } refusal)
            return refusal;

        if (string.IsNullOrWhiteSpace(dto.NewPassword))
            return ResetPasswordResultDto.Fail("No password entered");

        if (dto.NewPassword.Length < 8)
            return ResetPasswordResultDto.Fail("Password must be at least 8 characters long");

        await using var transaction = context.Database.IsNpgsql()
            ? await context.Database.BeginTransactionAsync()
            : null;
        var result = await ResetPasswordWithLockedUserAsync(dto);
        if (transaction is not null)
            await transaction.CommitAsync();
        if (result.IsSuccess)
            stamps.Forget(dto.UserId);
        return result;
    }

    private async Task<ResetPasswordResultDto> ResetPasswordWithLockedUserAsync(ResetPasswordDto dto)
    {
        var user = await SignInLockout.FindByIdForUpdateAsync(context, dto.UserId);
        if (user == null)
            return ResetPasswordResultDto.NotFound("User not found");

        user.PasswordHash = hasher.HashPassword(user, dto.NewPassword);
        user.SecurityStamp = Guid.NewGuid().ToString();
        // A reset is also how an admin lets a locked-out user back in.
        var unlocked = user.LockedUntil is not null;
        SignInLockout.Clear(user);
        await auditLog.LogAsync(
            "ResetPassword",
            "User",
            user.Id,
            $"Password reset for user {user.Name}{(unlocked ? ", which lifted the sign-in lock" : "")}");
        await context.SaveChangesAsync();

        return ResetPasswordResultDto.Success();
    }
}
