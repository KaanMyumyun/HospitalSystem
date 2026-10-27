using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Auth;

// Ten wrong passwords in a row lock an account for 15 minutes, whichever
// addresses they come from; the per-address rate limit cannot see that. A
// correct password clears the count, and an admin's password reset lifts the
// lock. Sign-in and changing your own password both count.
internal static class SignInLockout
{
    public const int MaxFailures = 10;
    public static readonly TimeSpan Duration = TimeSpan.FromMinutes(15);

    // Lock the account row before reading the count, password or lock expiry.
    // A transaction owned by the caller holds this lock through SaveChanges.
    // Reloading matters when the context already tracks the user: EF otherwise
    // returns the earlier in-memory values even though the SELECT waited for
    // another transaction to finish. New materializations already have the
    // current values and need no second query.
    public static async Task<UserEntity?> FindByNameForUpdateAsync(
        ApplicationDbContext context, string nameKey, CancellationToken cancellationToken = default)
    {
        if (!context.Database.IsNpgsql())
            return await context.Users.SingleOrDefaultAsync(u => u.Name.ToLower() == nameKey, cancellationToken);

        var trackedIds = context.ChangeTracker.Entries<UserEntity>().Select(e => e.Entity.Id).ToHashSet();
        var user = await context.Users
            .FromSqlInterpolated($"SELECT * FROM \"Users\" WHERE lower(\"Name\") = {nameKey} FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken);
        if (user is not null && trackedIds.Contains(user.Id))
            await context.Entry(user).ReloadAsync(cancellationToken);
        return user;
    }

    public static async Task<UserEntity?> FindByIdForUpdateAsync(
        ApplicationDbContext context, int id, CancellationToken cancellationToken = default)
    {
        if (!context.Database.IsNpgsql())
            return await context.Users.FindAsync([id], cancellationToken);

        var wasTracked = context.ChangeTracker.Entries<UserEntity>().Any(e => e.Entity.Id == id);
        var user = await context.Users
            .FromSqlInterpolated($"SELECT * FROM \"Users\" WHERE \"Id\" = {id} FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken);
        if (user is not null && wasTracked)
            await context.Entry(user).ReloadAsync(cancellationToken);
        return user;
    }

    public static bool IsLocked(UserEntity user, DateTime now) => user.LockedUntil > now;

    // Counts a wrong password. True when this one locks the account.
    public static bool RecordFailure(UserEntity user, DateTime now)
    {
        user.FailedSignInCount++;
        if (user.FailedSignInCount < MaxFailures)
            return false;

        user.FailedSignInCount = 0;
        user.LockedUntil = now + Duration;
        return true;
    }

    // True when there was a count or a lock to clear, so the caller knows
    // whether the user needs saving.
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
