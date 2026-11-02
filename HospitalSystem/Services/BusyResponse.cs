using System.Globalization;

namespace HospitalSystem.Services;

internal static class BusyResponse
{
    public const int RetryAfterSeconds = 2;

    public static async Task WriteAsync(HttpContext context)
    {
        context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        context.Response.Headers.RetryAfter = RetryAfterSeconds.ToString(CultureInfo.InvariantCulture);
        await context.Response.WriteAsJsonAsync(
            new { error = "The server is busy. Please try again in a few seconds." }, context.RequestAborted);
    }
}
