using System.Threading.RateLimiting;
using HospitalSystem.Services;

namespace HospitalSystem.Startup;

public static class RateLimits
{
    public const string Login = "login";

    public const string SignIn = "sign-in";

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
