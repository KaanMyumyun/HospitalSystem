using Microsoft.Extensions.Caching.Memory;

namespace HospitalSystem.Services.Auth;

// Every authenticated request checks the caller's security stamp. A stamp
// changes only when an admin rotates it, so each API instance remembers a
// user's stamp for a short while instead of reading it on every request. The
// instance that rotates a stamp forgets it at once; another instance keeps
// accepting the old stamp for at most Lifetime.
public sealed class SecurityStampCache(IMemoryCache cache)
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromSeconds(30);

    // The stamp a user's tokens must carry, or null if the user is gone.
    public async Task<string?> GetAsync(ApplicationDbContext db, int userId, CancellationToken cancellationToken = default)
    {
        if (cache.TryGetValue(new StampKey(userId), out string? stamp))
            return stamp;

        stamp = await SecurityStampClaims.CurrentStampAsync(db, userId, cancellationToken);
        if (stamp != null)
            cache.Set(new StampKey(userId), stamp, Lifetime);

        return stamp;
    }

    // Call after a new stamp is saved, so this instance stops accepting the old one.
    public void Forget(int userId) => cache.Remove(new StampKey(userId));

    // Its own key type, so no other user of the shared cache can collide with it.
    private readonly record struct StampKey(int UserId);
}
