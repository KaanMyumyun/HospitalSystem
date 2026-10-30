using System.Text.Json.Serialization;
using HospitalSystem.Services.Auth;
using HospitalSystem.Startup;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Prometheus;

if (args.Contains("--migrate", StringComparer.Ordinal))
{
    Environment.ExitCode = await DatabaseMigrationCommand.RunAsync(args);
    return;
}

if (args.Contains("--create-admin", StringComparer.Ordinal))
{
    Environment.ExitCode = await CreateAdminCommand.RunAsync(args, Console.In);
    return;
}

var builder = WebApplication.CreateBuilder(args);

var corsAllowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy
            .WithOrigins(corsAllowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithExposedHeaders("Retry-After")
            .SetPreflightMaxAge(TimeSpan.FromHours(2));
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>("database", tags: ["ready"]);
builder.Services.AddApiDocument();

builder.Services.AddHospitalServices(builder.Configuration);
builder.Services.AddTokenAuthentication(builder.Configuration);
builder.Services.AddAccessPolicies();
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddRateLimits();

var app = builder.Build();

app.UseClientAddresses();

if (app.Configuration.GetValue<bool>("Database:RunMigrationsOnStartup")
    && await DatabaseMigrationCommand.ApplyAsync(app.Configuration) != 0)
{
    Environment.ExitCode = 1;
    return;
}
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseJsonErrors();

app.UseRouting();
app.UseCors("ReactPolicy");
app.UseRateLimiter();
app.UseHttpMetrics();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health", new HealthCheckOptions { Predicate = _ => false })
    .AllowAnonymous();
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
}).AllowAnonymous();
app.MapControllers().RequireAuthorization(DemoReadOnly.Policy);
app.MapFallback("{*path}", context =>
{
    context.Response.StatusCode = StatusCodes.Status404NotFound;
    context.Response.ContentType = "application/json";
    return context.Response.WriteAsJsonAsync(new
    {
        error = "The requested resource was not found."
    });
}).AllowAnonymous();

var metricsPort = app.Configuration.GetValue("Metrics:Port", 9091);
if (metricsPort > 0)
{
    var metricServer = new KestrelMetricServer(port: metricsPort);
    metricServer.Start();
    app.Lifetime.ApplicationStopping.Register(() => metricServer.Stop());
}

app.Run();
