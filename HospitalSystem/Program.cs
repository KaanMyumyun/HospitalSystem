    using System.Text;
    using System.Text.Json.Serialization;
    using System.Threading.RateLimiting;
    using HospitalSystem.Interface;
    using HospitalSystem.Services;
    using Microsoft.EntityFrameworkCore;
    using Microsoft.IdentityModel.Tokens;
    using Microsoft.OpenApi.Models;
    using Prometheus;
    using HospitalSystem.Services.Appointments;
    using HospitalSystem.Interfaces.Appointments;
using HospitalSystem.Interface.Auth;
using HospitalSystem.Interface.Calendar;
using HospitalSystem.Interface.Department;
using HospitalSystem.Interface.User;


var builder = WebApplication.CreateBuilder(args);

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("ReactPolicy", policy =>
        {
            policy
                .WithOrigins(
                    "http://localhost:5173",
                    "http://localhost:3000",
                    "https://hospitalsystem.pages.dev",
                    "https://hostpitalsyst.servebeer.com"

                )
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
    });

    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
            options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        });
    builder.Services.AddHealthChecks();

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

        c.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
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

    var jwtSecret = builder.Configuration["JwtSettings:SecretKey"]
        ?? throw new Exception("JWT SecretKey is not configured");

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
        await context.HttpContext.Response.WriteAsync("Rate limit exceeded. API protection active. Please try again in a minute.", token);
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
    });


    var app = builder.Build();

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
    app.MapMetrics();
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapHealthChecks("/health");
    app.MapControllers();

    app.Run();
