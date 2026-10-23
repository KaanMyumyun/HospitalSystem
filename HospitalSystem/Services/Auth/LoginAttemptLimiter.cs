using System.Threading.RateLimiting;

namespace HospitalSystem.Services.Auth;

// Use the same five-attempt window as the other authentication endpoints,
// while allowing two people behind the same address to sign in separately.
public sealed class LoginAttemptLimiter : IDisposable
{
    private readonly PartitionedRateLimiter<LoginAttemptKey> _limiter =
        PartitionedRateLimiter.Create<LoginAttemptKey, LoginAttemptKey>(key =>
            RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    public RateLimitLease AttemptAcquire(System.Net.IPAddress? address, string userName)
    {
        var clientIp = address is { IsIPv4MappedToIPv6: true }
            ? address.MapToIPv4().ToString()
            : address?.ToString() ?? "unknown";
        return _limiter.AttemptAcquire(new LoginAttemptKey(clientIp, userName.Trim().ToLowerInvariant()));
    }

    public void Dispose() => _limiter.Dispose();

    private readonly record struct LoginAttemptKey(string ClientIp, string UserName);
}
