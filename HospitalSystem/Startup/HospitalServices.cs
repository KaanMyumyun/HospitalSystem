using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Appointments;
using HospitalSystem.Interfaces.Auth;
using HospitalSystem.Interfaces.Calendar;
using HospitalSystem.Interfaces.Department;
using HospitalSystem.Interfaces.User;
using HospitalSystem.Services;
using HospitalSystem.Services.Appointments;
using HospitalSystem.Services.Auth;
using HospitalSystem.Services.Calendar;
using HospitalSystem.Services.Department;
using HospitalSystem.Services.User;
using Microsoft.AspNetCore.Identity;

namespace HospitalSystem.Startup;

public static class HospitalServices
{
    // The clinic's clock, settings and every service the controllers use.
    public static IServiceCollection AddHospitalServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddSingleton(TimeProvider.System);
        // Bookings are checked against the clinic's wall clock, so a wrong zone
        // would quietly refuse or allow the wrong hours: refuse to start instead.
        var clinicClock = ClinicClock.For(configuration["Clinic:TimeZone"], TimeProvider.System)
            ?? throw new InvalidOperationException("Clinic:TimeZone must be an IANA time zone, such as Europe/Sofia");
        services.AddSingleton(clinicClock);
        services.AddSingleton<IPasswordHasher<UserEntity>, PasswordHasher<UserEntity>>();

        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddScoped<IAuditLogQueryService, AuditLogQueryService>();

        services.AddScoped<IPatientService, PatientService>();
        services.AddScoped<IAppointmentQueryService, AppointmentQueryService>();
        services.AddScoped<IAppointmentCancellationService, AppointmentCancellationService>();
        services.AddScoped<IAppointmentCreationService, AppointmentCreationService>();
        services.AddScoped<IAppointmentMoveService, AppointmentMoveService>();
        services.AddScoped<IAppointmentStatusService, AppointmentStatusService>();
        services.AddScoped<IPatientRecordService, PatientRecordService>();

        services.AddScoped<ILoginService, LoginService>();
        services.AddScoped<ISessionRenewalService, SessionRenewalService>();
        services.AddSingleton<LoginAttemptLimiter>();
        services.AddScoped<LoginRateLimitFilter>();
        services.AddHostedService<SignInWarmup>();
        services.AddMemoryCache();
        services.AddSingleton<SecurityStampCache>();
        services.AddScoped<IUserCreationService, UserCreationService>();
        services.AddScoped<IChangePasswordService, ChangePasswordService>();

        services.AddScoped<IScheduleCreationService, ScheduleCreationService>();
        services.AddScoped<IScheduleModificationService, ScheduleModificationService>();
        services.AddScoped<IScheduleQueryService, ScheduleQueryService>();
        services.AddScoped<ITimeOffService, TimeOffService>();

        services.AddScoped<IDepartmentQueryService, DepartmentQueryService>();
        services.AddScoped<IDepartmentCreationService, DepartmentCreationService>();
        services.AddScoped<IDepartmentStatusService, DepartmentStatusService>();
        services.AddScoped<IDoctorDepartmentService, DoctorDepartmentService>();

        services.AddScoped<IUserQueryService, UserQueryService>();
        services.AddScoped<IResetPasswordService, ResetPasswordService>();
        services.AddScoped<IChangeRoleService, ChangeRoleService>();
        services.AddScoped<ICreateDoctorService, CreateDoctorService>();
        services.AddScoped<IDoctorStatusService, DoctorStatusService>();

        services.Configure<JwtSettings>(configuration.GetSection("JwtSettings"));
        services.Configure<DemoSettings>(configuration.GetSection("Demo"));

        return services;
    }
}
