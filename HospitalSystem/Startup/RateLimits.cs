using System.Threading.RateLimiting;
using HospitalSystem.Services;

namespace HospitalSystem.Startup;

public static class RateLimits
{
    // Five a minute per address, for demo sign-ins and password changes.
    public const string Login = "login";

    // Password sign-ins from one address, whatever usernames it tries:
    // enough for a ward signing in through one office address at shift
    // change, too few to spray a password across every account. Each
    // username also gets five a minute (LoginRateLimitFilter), and ten
    // wrong passwords in a row lock the account.
    public const string SignIn = "sign-in";

    // Every request also counts against 60 a minute per address. Addresses
    // are the clients' own behind a trusted proxy (UseClientAddresses).
    public static IServiceCollection AddRateLimits(this IServiceCollection services) =>
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, token) =>
                await RateLimitResponse.WriteAsync(context.HttpContext, context.Lease, token);

            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(
                httpContext => PerAddress(httpContext, 60));
            options.AddPolicy(Login, httpContext => PerAddress(httpContext, 5));
            options.AddPolicy(SignIn, httpContext => PerAddress(httpContext, 20));
        });

    private static RateLimitPartition<string> PerAddress(HttpContext httpContext, int permitsPerMinute)
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = permitsPerMinute,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        });
    }
}
