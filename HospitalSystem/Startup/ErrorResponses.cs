using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HospitalSystem.Startup;

public static class ErrorResponses
{
    // An exception no service handled answers with JSON the frontend can show,
    // never the exception itself. A unique violation is a change that raced
    // another one, so it answers 409; anything else is logged and answers 500.
    public static WebApplication UseJsonErrors(this WebApplication app)
    {
        app.UseExceptionHandler(errorApp =>
        {
            errorApp.Run(async context =>
            {
                var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
                var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();

                if (exception is DbUpdateException { InnerException: PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } })
                {
                    logger.LogWarning(exception,
                        "Unique constraint violation processing {Method} {Path}",
                        context.Request.Method, context.Request.Path);

                    context.Response.StatusCode = StatusCodes.Status409Conflict;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new
                    {
                        error = "This conflicts with a change made at the same time. Refresh and try again."
                    });
                    return;
                }

                if (exception is not null)
                {
                    logger.LogError(exception,
                        "Unhandled exception processing {Method} {Path}",
                        context.Request.Method, context.Request.Path);
                }

                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "Something went wrong while processing the request. Please try again."
                });
            });
        });

        return app;
    }
}
