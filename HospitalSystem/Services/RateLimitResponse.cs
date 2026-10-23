using System.Globalization;
using System.Threading.RateLimiting;

namespace HospitalSystem.Services;

internal static class RateLimitResponse
{
    public static async Task WriteAsync(HttpContext context, RateLimitLease lease, CancellationToken token)
    {
        context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        if (lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            var seconds = Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds));
            context.Response.Headers.RetryAfter = seconds.ToString(CultureInfo.InvariantCulture);
        }

        await context.Response.WriteAsJsonAsync(
            new { error = "Too many requests. Please wait a moment and try again." }, token);
    }
}
