    using System.Net;
    using System.Security.Claims;
    using System.Text;
    using System.Text.Json.Serialization;
    using System.Threading.RateLimiting;
    using Microsoft.AspNetCore.Authentication.JwtBearer;
    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.HttpOverrides;
    using HospitalSystem.Interfaces;
    using HospitalSystem.Services;
    using Microsoft.AspNetCore.Diagnostics;
    using Microsoft.AspNetCore.Diagnostics.HealthChecks;
    using Microsoft.EntityFrameworkCore;
    using Microsoft.IdentityModel.Tokens;
    using Microsoft.OpenApi;
    using Npgsql;
    using Prometheus;
    using HospitalSystem.Services.Appointments;
    using HospitalSystem.Services.Auth;
    using HospitalSystem.Services.Calendar;
    using HospitalSystem.Services.Deparment;
    using HospitalSystem.Services.User;
    using HospitalSystem.Interfaces.Appointments;
using HospitalSystem.Interfaces.Auth;
using HospitalSystem.Interfaces.Calendar;
using HospitalSystem.Interfaces.Department;
using HospitalSystem.Interfaces.User;
using HospitalSystem.Data;

if (args.Contains("--migrate", StringComparer.Ordinal))
{
    Environment.ExitCode = await DatabaseMigrationCommand.RunAsync(args);
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
                .WithExposedHeaders("Retry-After");
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

    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo
        {
            Title = "HospitalSystem API",
            Version = "v1"
        });
        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "Bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Enter 'Bearer {token}'"
        });

        c.AddSecurityRequirement(document => new OpenApiSecurityRequirement
        {
            { new OpenApiSecuritySchemeReference("Bearer", document), new List<string>() }
        });
    });

    builder.Services.AddHttpContextAccessor();

    builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
    builder.Services.AddScoped<IAuditLogService, AuditLogService>();

    builder.Services.AddScoped<IPatientService, PatientService>();
    builder.Services.AddScoped<IAppointmentQueryService, AppointmentQueryService>();
    builder.Services.AddScoped<IAppointmentCancellationService, AppointmentCancellationService>();
    builder.Services.AddScoped<IAppointmentCreationService, AppointmentCreationService>();

    builder.Services.AddScoped<ILoginService, LoginService>();
    builder.Services.AddScoped<IUserCreationService, UserCreationService>();

    builder.Services.AddScoped<IScheduleCreationService, ScheduleCreationService>();
    builder.Services.AddScoped<IScheduleModificationService, ScheduleModificationService>();
    builder.Services.AddScoped<IScheduleQueryService, ScheduleQueryService>();

    builder.Services.AddScoped<IDepartmentQueryService, DepartmentQueryService>();
    builder.Services.AddScoped<IDepartmentCreationService, DepartmentCreationService>();
    builder.Services.AddScoped<IDepartmentStatusService, DepartmentStatusService>();
    builder.Services.AddScoped<IDoctorDepartmentService, DoctorDepartmentService>();

    builder.Services.AddScoped<IUserQueryService, UserQueryService>();
    builder.Services.AddScoped<IResetPasswordService, ResetPasswordService>();
    builder.Services.AddScoped<IChangeRoleService, ChangeRoleService>();
    builder.Services.AddScoped<ICreateDoctorService, CreateDoctorService>();
    builder.Services.AddScoped<IDoctorStatusService, DoctorStatusService>();

    builder.Services.Configure<JwtSettings>(
        builder.Configuration.GetSection("JwtSettings"));
    builder.Services.Configure<DemoSettings>(
        builder.Configuration.GetSection("Demo"));

    var jwtSecret = builder.Configuration["JwtSettings:SecretKey"];
    if (string.IsNullOrWhiteSpace(jwtSecret))
        throw new Exception("JWT SecretKey is not configured");

    builder.Services.AddAuthentication("Bearer")
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
                ValidAudience = builder.Configuration["JwtSettings:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(jwtSecret)
                )
            };
            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = async context =>
                {
                    var userIdClaim = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                    var stampClaim = context.Principal?.FindFirst(SecurityStampClaims.ClaimType)?.Value;

                    if (!int.TryParse(userIdClaim, out var userId))
                    {
                        context.Fail("Invalid token");
                        return;
                    }

                    var db = context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
                    var currentStamp = await db.Users
                        .Where(u => u.Id == userId)
                        .Select(u => u.SecurityStamp)
                        .FirstOrDefaultAsync();

                    if (currentStamp == null || currentStamp != stampClaim)
                        context.Fail("Token has been revoked");
                }
            };
        });

    builder.Services.AddAuthorization(options =>
    {
        options.FallbackPolicy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .Build();
    });

    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection")
        ));
        builder.Services.AddRateLimiter(options =>
    {
    
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    
    options.OnRejected = async (context, token) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            var seconds = Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds));
            context.HttpContext.Response.Headers.RetryAfter = seconds.ToString(System.Globalization.CultureInfo.InvariantCulture);
        }

        await context.HttpContext.Response.WriteAsJsonAsync(
            new { error = "Too many requests. Please wait a moment and try again." }, token);
    };
        
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
        });

        options.AddPolicy("login", httpContext =>
        {
            var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
        });
    });


    var app = builder.Build();

    var forwardedHeadersOptions = new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
    };
    foreach (var proxy in app.Configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>() ?? [])
    {
        if (IPAddress.TryParse(proxy, out var proxyIp))
            forwardedHeadersOptions.KnownProxies.Add(proxyIp);
    }
    foreach (var network in app.Configuration.GetSection("ForwardedHeaders:KnownNetworks").Get<string[]>() ?? [])
    {
        if (System.Net.IPNetwork.TryParse(network, out var ipNetwork))
            forwardedHeadersOptions.KnownIPNetworks.Add(ipNetwork);
    }
    app.UseForwardedHeaders(forwardedHeadersOptions);

    if (app.Configuration.GetValue<bool>("Database:RunMigrationsOnStartup"))
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Database.Migrate();
    }
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }
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
    app.MapControllers();
    app.MapFallback(context =>
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
