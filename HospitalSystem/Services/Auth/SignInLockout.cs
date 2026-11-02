using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Auth;

internal static class SignInLockout
{
    public const int MaxFailures = 10;
    public static readonly TimeSpan Duration = TimeSpan.FromMinutes(15);

    public static async Task<UserEntity?> FindByIdForUpdateAsync(
        ApplicationDbContext context, int id, CancellationToken cancellationToken = default)
    {
        if (!context.Database.IsNpgsql())
            return await context.Users.FindAsync([id], cancellationToken);

        var wasTracked = context.ChangeTracker.Entries<UserEntity>().Any(e => e.Entity.Id == id);
        var user = await context.Users
            .FromSqlInterpolated($"SELECT * FROM \"Users\" WHERE \"Id\" = {id} FOR NO KEY UPDATE")
            .SingleOrDefaultAsync(cancellationToken);
        if (user is not null && wasTracked)
            await context.Entry(user).ReloadAsync(cancellationToken);
        return user;
    }

    public static bool IsLocked(UserEntity user, DateTime now) => user.LockedUntil > now;

    public static bool RecordFailure(UserEntity user, DateTime now)
    {
        user.FailedSignInCount++;
        if (user.FailedSignInCount < MaxFailures)
            return false;

        user.FailedSignInCount = 0;
        user.LockedUntil = now + Duration;
        return true;
    }

    public static bool Clear(UserEntity user)
    {
        if (user.FailedSignInCount == 0 && user.LockedUntil is null)
            return false;

        user.FailedSignInCount = 0;
        user.LockedUntil = null;
        return true;
    }

    public static string LockedMessage(UserEntity user, DateTime now)
    {
        var minutes = Math.Max(1, (int)Math.Ceiling(((user.LockedUntil ?? now) - now).TotalMinutes));
        return $"Too many wrong passwords. Try again in {minutes} minute{(minutes == 1 ? "" : "s")}, or ask an admin to reset the password.";
    }

    public static string LockedAuditDetails(UserEntity user) =>
        $"User {user.Name} locked for {Duration.TotalMinutes:0} minutes after {MaxFailures} wrong passwords in a row";
}
