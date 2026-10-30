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
                services.Remove(services.Single(s => s.ImplementationType == typeof(SignInWarmup)));
                services.AddTransient<IStartupFilter, ProxyAddress>();
            });

            builder.ConfigureTestServices(services =>
            {
                if (database is not null)
                {
                    services.RemoveAll(typeof(IDbContextOptionsConfiguration<ApplicationDbContext>));
                    services.RemoveAll(typeof(DbContextOptions<ApplicationDbContext>));
                    services.AddDbContext<ApplicationDbContext>(options => options
                        .UseInMemoryDatabase(database)
                        .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));
                }
                configureServices?.Invoke(services);
            });
        });

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
