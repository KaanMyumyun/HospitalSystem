    using System.Net;
    using System.Security.Claims;
    using System.Text;
    using System.Text.Json.Serialization;
    using System.Threading.RateLimiting;
    using Microsoft.AspNetCore.Authentication.JwtBearer;
    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.HttpOverrides;
    using Microsoft.AspNetCore.Identity;
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
    using HospitalSystem.Services.Department;
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
            // Browsers may reuse a preflight answer for up to two hours (Chrome's
            // cap), so cross-origin calls skip the extra OPTIONS round trip.
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

    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        // string means never null and string? may be null, so the frontend's
        // generated types say which fields can be missing.
        c.SupportNonNullableReferenceTypes();
        // Lets a property that refers to another schema say it may be null.
        c.UseAllOfToExtendReferenceSchemas();
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
    builder.Services.AddSingleton(TimeProvider.System);
    builder.Services.AddSingleton<IPasswordHasher<UserEntity>, PasswordHasher<UserEntity>>();

    builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
    builder.Services.AddScoped<IAuditLogService, AuditLogService>();
    builder.Services.AddScoped<IAuditLogQueryService, AuditLogQueryService>();

    builder.Services.AddScoped<IPatientService, PatientService>();
    builder.Services.AddScoped<IAppointmentQueryService, AppointmentQueryService>();
    builder.Services.AddScoped<IAppointmentCancellationService, AppointmentCancellationService>();
    builder.Services.AddScoped<IAppointmentCreationService, AppointmentCreationService>();
    builder.Services.AddScoped<IAppointmentStatusService, AppointmentStatusService>();
    builder.Services.AddScoped<IPatientRecordService, PatientRecordService>();

    builder.Services.AddScoped<ILoginService, LoginService>();
    builder.Services.AddSingleton<LoginAttemptLimiter>();
    builder.Services.AddScoped<LoginRateLimitFilter>();
    builder.Services.AddHostedService<SignInWarmup>();
    builder.Services.AddMemoryCache();
    builder.Services.AddSingleton<SecurityStampCache>();
    builder.Services.AddScoped<IUserCreationService, UserCreationService>();
    builder.Services.AddScoped<IChangePasswordService, ChangePasswordService>();

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
        throw new InvalidOperationException("JWT SecretKey is not configured");
    // Tokens are signed with HMAC-SHA256, which needs a 256-bit key. A shorter
    // key would start fine and then fail every sign-in.
    if (Encoding.UTF8.GetByteCount(jwtSecret) < 32)
        throw new InvalidOperationException("JWT SecretKey must be at least 32 bytes (256 bits) long");
    // Keys anyone can read: the placeholder once committed to appsettings.json
    // and the templates' example value.
    string[] publishedJwtKeys =
    [
        "THIS_SHOULD_BE_LONG_AND_SECRET_123456789",
        "replace-with-a-random-string-of-at-least-32-characters"
    ];
    if (publishedJwtKeys.Contains(jwtSecret.Trim()))
        throw new InvalidOperationException("JWT SecretKey is a published example value; generate a random key of your own");

    builder.Services.AddAuthentication("Bearer")
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                // Not the default five minutes: an expired token stops working
                // within 30 seconds, which still covers small clock differences
                // between API instances.
                ClockSkew = TimeSpan.FromSeconds(30),
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

                    var services = context.HttpContext.RequestServices;
                    var currentStamp = await services.GetRequiredService<SecurityStampCache>().GetAsync(
                        services.GetRequiredService<ApplicationDbContext>(), userId, context.HttpContext.RequestAborted);

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
        options.AddPolicy(DemoReadOnly.Policy, policy => policy
            .RequireAuthenticatedUser()
            .AddRequirements(new DemoReadOnly()));
    });

    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection")
        ));
        builder.Services.AddRateLimiter(options =>
    {

        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, token) =>
        await RateLimitResponse.WriteAsync(context.HttpContext, context.Lease, token);

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

        // Password sign-ins from one address, whatever usernames it tries:
        // enough for a ward signing in through one office address at shift
        // change, too few to spray a password across every account. Each
        // username also gets five a minute (LoginRateLimitFilter), and ten
        // wrong passwords in a row lock the account.
        options.AddPolicy("sign-in", httpContext =>
        {
            var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
        });
    });


    var app = builder.Build();

    // Behind a proxy every request comes from the proxy's address, and the
    // per-address rate limits would put all users in one bucket. The client's
    // address is read from X-Forwarded-For when the request comes from a proxy
    // listed in KnownProxies or KnownNetworks, or from any proxy when
    // TrustAllProxies is set. That is safe only where the API cannot be reached
    // except through the platform's proxy, as on Render or behind a Kubernetes
    // ingress. ForwardLimit is how many proxies add an entry; with more, a
    // client could choose its own address. LogClientAddress logs the result of
    // every request, to check the setting once after a deploy.
    var forwardedHeaders = app.Configuration.GetSection("ForwardedHeaders");
    var forwardLimit = forwardedHeaders.GetValue("ForwardLimit", 1);
    if (forwardLimit < 1)
        throw new InvalidOperationException("ForwardedHeaders:ForwardLimit must be at least 1");
    var forwardedHeadersOptions = new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
        ForwardLimit = forwardLimit
    };
    if (forwardedHeaders.GetValue<bool>("TrustAllProxies"))
    {
        // Empty lists mean any proxy; a listed one would narrow it again.
        forwardedHeadersOptions.KnownProxies.Clear();
        forwardedHeadersOptions.KnownIPNetworks.Clear();
        app.Logger.LogInformation("Reading client addresses from X-Forwarded-For through {ForwardLimit} proxies", forwardLimit);
    }
    else
    {
        foreach (var proxy in forwardedHeaders.GetSection("KnownProxies").Get<string[]>() ?? [])
        {
            if (IPAddress.TryParse(proxy, out var proxyIp))
                forwardedHeadersOptions.KnownProxies.Add(proxyIp);
        }
        foreach (var network in forwardedHeaders.GetSection("KnownNetworks").Get<string[]>() ?? [])
        {
            if (System.Net.IPNetwork.TryParse(network, out var ipNetwork))
                forwardedHeadersOptions.KnownIPNetworks.Add(ipNetwork);
        }
    }
    app.UseForwardedHeaders(forwardedHeadersOptions);
    if (forwardedHeaders.GetValue<bool>("LogClientAddress"))
    {
        app.Use(async (context, next) =>
        {
            app.Logger.LogInformation(
                "Client address {ClientAddress} for {Method} {Path}; X-Forwarded-For entries not used: {Unused}",
                context.Connection.RemoteIpAddress, context.Request.Method, context.Request.Path,
                context.Request.Headers["X-Forwarded-For"].ToString());
            await next();
        });
    }

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
    // Every controller endpoint also requires DemoReadOnly, on top of its own
    // roles; sign-in, which allows anonymous callers, needs no policy at all.
    app.MapControllers().RequireAuthorization(DemoReadOnly.Policy);
    // The explicit pattern also covers paths with a file extension, such as
    // /favicon.ico, which MapFallback's default pattern leaves out.
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
