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
    public async Task<ResetPasswordResultDto> ResetPasswordAsync(
        ResetPasswordDto dto, CancellationToken cancellationToken = default)
    {
        if (currentUser.RequireAdmin<ResetPasswordResultDto>("reset a password") is { } refusal)
            return refusal;

        if (string.IsNullOrWhiteSpace(dto.NewPassword))
            return ResetPasswordResultDto.Fail("No password entered");

        if (AccountRules.PasswordError(dto.NewPassword) is { } passwordError)
            return ResetPasswordResultDto.Fail(passwordError);

        await using var transaction = context.Database.IsNpgsql()
            ? await context.Database.BeginTransactionAsync(cancellationToken)
            : null;
        var result = await ResetPasswordWithLockedUserAsync(dto, cancellationToken);
        if (transaction is not null)
            await transaction.CommitAsync(cancellationToken);
        if (result.IsSuccess)
            stamps.Forget(dto.UserId);
        return result;
    }

    private async Task<ResetPasswordResultDto> ResetPasswordWithLockedUserAsync(
        ResetPasswordDto dto, CancellationToken cancellationToken)
    {
        var user = await SignInLockout.FindByIdForUpdateAsync(context, dto.UserId, cancellationToken);
        if (user == null)
            return ResetPasswordResultDto.NotFound("User not found");

        user.PasswordHash = hasher.HashPassword(user, dto.NewPassword);
        user.SecurityStamp = Guid.NewGuid().ToString();
        var unlocked = user.LockedUntil is not null;
        SignInLockout.Clear(user);
        await auditLog.LogAsync(
            "ResetPassword",
            "User",
            user.Id,
            $"Password reset for user {user.Name}{(unlocked ? ", which lifted the sign-in lock" : "")}",
            cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        return ResetPasswordResultDto.Success();
    }
}
