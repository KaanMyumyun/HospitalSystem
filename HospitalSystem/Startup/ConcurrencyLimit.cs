using System.Threading.RateLimiting;
using HospitalSystem.Services;
using Microsoft.AspNetCore.Mvc.Controllers;
using Npgsql;

namespace HospitalSystem.Startup;

public static class ConcurrencyLimit
{
    public static WebApplication UseConcurrencyLimit(this WebApplication app)
    {
        var connection = new NpgsqlConnectionStringBuilder(app.Configuration.GetConnectionString("DefaultConnection"));
        var limiter = new ConcurrencyLimiter(new ConcurrencyLimiterOptions
        {
            PermitLimit = connection.MaxPoolSize,
            QueueLimit = 0
        });

        app.Use(async (context, next) =>
        {
            if (context.GetEndpoint()?.Metadata.GetMetadata<ControllerActionDescriptor>() is null)
            {
                await next();
                return;
            }

            using var lease = limiter.AttemptAcquire();
            if (!lease.IsAcquired)
            {
                await BusyResponse.WriteAsync(context);
                return;
            }

            await next();
        });

        return app;
    }
}
