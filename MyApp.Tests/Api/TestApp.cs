using System.Net;
using HospitalSystem.Services.Auth;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace HospitalSystem.Tests;

// The real API in memory. Without a database it covers what needs none, such
// as startup checks and the OpenAPI document; with an in-memory one it serves
// whole requests: authentication, rate limits and status codes.
public static class TestApp
{
    public const string JwtKey = "test-signing-key-that-is-32-bytes!";

    public static WebApplicationFactory<Program> Create(
        string environment = "Production",
        string? jwtKey = null,
        string? database = null,
        IDictionary<string, string?>? settings = null,
        Action<IServiceCollection>? configureServices = null) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            builder.UseSetting("JwtSettings:SecretKey", jwtKey ?? JwtKey);
            builder.UseSetting("Metrics:Port", "0");
            foreach (var (key, value) in settings ?? new Dictionary<string, string?>())
                builder.UseSetting(key, value);

            builder.ConfigureServices(services =>
            {
                // The sign-in warm-up would only log that there is no database.
                services.Remove(services.Single(s => s.ImplementationType == typeof(SignInWarmup)));
                services.AddTransient<IStartupFilter, ProxyAddress>();
            });

            builder.ConfigureTestServices(services =>
            {
                if (database is not null)
                {
                    // Npgsql's registration goes, so only the in-memory provider is left.
                    services.RemoveAll(typeof(IDbContextOptionsConfiguration<ApplicationDbContext>));
                    services.RemoveAll(typeof(DbContextOptions<ApplicationDbContext>));
                    services.AddDbContext<ApplicationDbContext>(options => options
                        .UseInMemoryDatabase(database)
                        .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));
                }
                configureServices?.Invoke(services);
            });
        });

    // The test server leaves the caller's address empty, which ASP.NET treats
    // as a server that cannot tell, and then believes X-Forwarded-For from
    // anyone. Kestrel always knows it; behind a proxy it is the proxy's.
    public static readonly IPAddress ProxyIp = IPAddress.Parse("10.0.0.5");

    private sealed class ProxyAddress : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            app.Use((context, nextMiddleware) =>
            {
                context.Connection.RemoteIpAddress ??= ProxyIp;
                return nextMiddleware(context);
            });
            next(app);
        };
    }

    private static void RemoveAll(this IServiceCollection services, Type serviceType)
    {
        foreach (var descriptor in services.Where(s => s.ServiceType == serviceType).ToList())
            services.Remove(descriptor);
    }
}
