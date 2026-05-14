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

    // Cords to front end
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("ReactPolicy", policy =>
        {
            policy
                .WithOrigins(
                    "http://localhost:5173", // local
                    "https://hospitalsystem.pages.dev",
                    "https://hostpitalsyst.servebeer.com"

                )
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
    });

    // Controllers + jsons

    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
            options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        });

    // swager + JWT 

    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo
        {
            Title = "HospitalSystem API",
            Version = "v1"
        });
    //test
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


    // services

    builder.Services.AddHttpContextAccessor();

    // builder.Services.AddScoped<IAuthService, AuthService>();
    // builder.Services.AddScoped<IUserService, UserService>();
    // builder.Services.AddScoped<IAppointmentService, AppointmentService>();
    // builder.Services.AddScoped<IDepartmentService, DepartmentService>();
    builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
    // builder.Services.AddScoped<ICalendarService, CalendarService>();

    // appointmets
    builder.Services.AddScoped<IPatientService, PatientService>();
    builder.Services.AddScoped<IAppointmentQueryService, AppointmentQueryService>();
    builder.Services.AddScoped<IAppointmentCancellationService, AppointmentCancellationService>();
    builder.Services.AddScoped<IAppointmentCreationService, AppointmentCreationService>();

    //auth
    builder.Services.AddScoped<ILoginService, LoginService>();
    builder.Services.AddScoped<IUserCreationService, UserCreationService>();

    // calendar 
    builder.Services.AddScoped<IScheduleCreationService, ScheduleCreationService>();
    builder.Services.AddScoped<IScheduleModificationService, ScheduleModificationService>();
    builder.Services.AddScoped<IScheduleQueryService, ScheduleQueryService>();

    // deparment 
    builder.Services.AddScoped<IDepartmentQueryService, DepartmentQueryService>();
    builder.Services.AddScoped<IDepartmentCreationService, DepartmentCreationService>();
    builder.Services.AddScoped<IDepartmentStatusService, DepartmentStatusService>();
    builder.Services.AddScoped<IDoctorDepartmentService, DoctorDepartmentService>();

    //user 
    builder.Services.AddScoped<IUserQueryService, UserQueryService>();
    builder.Services.AddScoped<IResetPasswordService, ResetPasswordService>();
    builder.Services.AddScoped<IChangeRoleService, ChangeRoleService>();
    builder.Services.AddScoped<ICreateDoctorService, CreateDoctorService>();
    builder.Services.AddScoped<IDoctorStatusService, DoctorStatusService>();

    // JWT config

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

    // PostgreSQL 
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
                PermitLimit = 60,                 // 60 requests 
                Window = TimeSpan.FromMinutes(1), // Per 1 minute
                QueueLimit = 0                    
            });
        });
    });


    var app = builder.Build();

    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Database.Migrate();
    }
    //swagger

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }
//

    app.UseRouting();
    app.UseCors("ReactPolicy");
    app.UseRateLimiter();
    app.UseHttpMetrics();   
    app.MapMetrics();
    //
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();

    app.Run();
