using Microsoft.Extensions.Caching.Memory;

namespace HospitalSystem.Services.Auth;

public sealed class SecurityStampCache(IMemoryCache cache)
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromSeconds(30);

    public async Task<string?> GetAsync(ApplicationDbContext db, int userId, CancellationToken cancellationToken = default)
    {
        if (cache.TryGetValue(new StampKey(userId), out string? stamp))
            return stamp;

        stamp = await SecurityStampClaims.CurrentStampAsync(db, userId, cancellationToken);
        if (stamp != null)
            cache.Set(new StampKey(userId), stamp, Lifetime);

        return stamp;
    }

    public void Forget(int userId) => cache.Remove(new StampKey(userId));

    private readonly record struct StampKey(int UserId);
}
