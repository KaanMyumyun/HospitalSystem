using HospitalSystem.Services.Auth;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace HospitalSystem.Tests;

// The real API in memory, without a database: for what can be checked without
// one, such as startup checks and the OpenAPI document.
public static class TestApp
{
    public static WebApplicationFactory<Program> Create(string environment = "Production", string? jwtKey = null) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            builder.UseSetting("JwtSettings:SecretKey", jwtKey ?? new string('k', 32));
            builder.UseSetting("Metrics:Port", "0");
            builder.ConfigureServices(services =>
            {
                // The sign-in warm-up would only log that there is no database.
                services.Remove(services.Single(s => s.ImplementationType == typeof(SignInWarmup)));
            });
        });
}
