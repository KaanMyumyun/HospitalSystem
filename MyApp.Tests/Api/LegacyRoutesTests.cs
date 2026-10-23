using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using HospitalSystem.Controllers;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HospitalSystem.Tests;

public class LegacyRoutesTests
{
    private const string Password = "correct-horse-battery";

    [Fact]
    public async Task EveryPreviousFrontendPath_HasAnEndpoint()
    {
        await using var app = TestApp.Create();
        _ = app.CreateClient();
        var endpoints = app.Services.GetRequiredService<EndpointDataSource>().Endpoints
            .OfType<RouteEndpoint>().ToList();
        var previousPaths = new (string Method, string Path)[]
        {
            ("GET", "api/Appointments/ListAppointments"),
            ("GET", "api/Appointments/MyAppointments"),
            ("POST", "api/Appointments/CreateAppointment"),
            ("POST", "api/Appointments/CancelAppointment"),
            ("POST", "api/Appointments/ChangeAppointmentStatus"),
            ("GET", "api/Patients/ListPatients"),
            ("POST", "api/Patients/UpdatePatient"),
            ("GET", "api/AuditLogs/ListAuditLogs"),
            ("POST", "api/Auth/CreateUser"),
            ("GET", "api/schedule/list-schedule"),
            ("POST", "api/schedule/create-schedule"),
            ("POST", "api/schedule/change-schedule"),
            ("GET", "api/Department/ViewDepartment"),
            ("POST", "api/Department/CreateDepartment"),
            ("POST", "api/Department/ChangeDepartmentStatus"),
            ("POST", "api/Department/ChangeDoctorDepartment"),
            ("GET", "api/Users/ListUsers"),
            ("GET", "api/Users/ListDoctors"),
            ("POST", "api/Users/change-role"),
            ("POST", "api/Users/create-doctor"),
            ("POST", "api/Users/change-doctor-status"),
            ("POST", "api/Users/reset-password")
        };

        foreach (var (method, path) in previousPaths)
            Assert.Contains(endpoints, endpoint => endpoint.RoutePattern.RawText == path
                && endpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods.Contains(method) == true);
    }

    [Fact]
    public void PreviousBodyIds_StillSetTheIdsUsedByServices()
    {
        Assert.Equal(7, ((CancelAppointmentDto)Read<LegacyCancelAppointmentDto>("appointmentId")).AppointmentId);
        Assert.Equal(7, ((ChangeAppointmentStatusDto)Read<LegacyChangeAppointmentStatusDto>("appointmentId")).AppointmentId);
        Assert.Equal(7, ((UpdatePatientDto)Read<LegacyUpdatePatientDto>("patientId")).PatientId);
        Assert.Equal(7, ((ChangeScheduleDto)Read<LegacyChangeScheduleDto>("scheduleId")).ScheduleId);
        Assert.Equal(7, ((ChangeDepartmentStatusDto)Read<LegacyChangeDepartmentStatusDto>("departmentId")).DepartmentId);
        Assert.Equal(7, ((ChangeDoctorDepartmentDto)Read<LegacyChangeDoctorDepartmentDto>("doctorId")).DoctorId);
        Assert.Equal(7, ((ChangeRoleDto)Read<LegacyChangeRoleDto>("userId")).UserId);
        Assert.Equal(7, ((ChangeDoctorStatusDto)Read<LegacyChangeDoctorStatusDto>("doctorId")).DoctorId);
        Assert.Equal(7, ((ResetPasswordDto)Read<LegacyResetPasswordDto>("userId")).UserId);

        static T Read<T>(string property) => JsonSerializer.Deserialize<T>($"{{\"{property}\":7}}")!;
    }

    [Fact]
    public async Task PreviousRoutes_UseTheCurrentServicesAndRoleChecks()
    {
        await using var app = TestApp.Create(database: Guid.NewGuid().ToString());
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var hasher = new PasswordHasher<UserEntity>();
        var admin = new UserEntity { Name = "admin", Role = UserRole.Admin };
        admin.PasswordHash = hasher.HashPassword(admin, Password);
        var desk = new UserEntity { Name = "desk", Role = UserRole.FrontDesk };
        desk.PasswordHash = hasher.HashPassword(desk, Password);
        var department = new DepartmentEntity { Department = "Cardiology", IsActive = true };
        db.AddRange(admin, desk, department);
        await db.SaveChangesAsync();

        var anonymous = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await anonymous.GetAsync("/api/Department/ViewDepartment")).StatusCode);

        var deskClient = await SignedInAsync(app, "desk");
        Assert.Equal(HttpStatusCode.OK,
            (await deskClient.GetAsync("/api/Department/ViewDepartment")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await deskClient.PostAsJsonAsync("/api/Department/ChangeDepartmentStatus",
                new { departmentId = department.Id, isActive = false })).StatusCode);

        var adminClient = await SignedInAsync(app, "admin");
        var status = await adminClient.PostAsJsonAsync("/api/Department/ChangeDepartmentStatus",
            new { departmentId = department.Id, isActive = false });
        Assert.Equal(HttpStatusCode.OK, status.StatusCode);
        db.ChangeTracker.Clear();
        Assert.False((await db.Departments.SingleAsync()).IsActive);

        var reset = await adminClient.PostAsJsonAsync("/api/Users/reset-password",
            new { userId = desk.Id, newPassword = "a-different-password" });
        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);
        db.ChangeTracker.Clear();
        Assert.NotEqual(PasswordVerificationResult.Failed,
            hasher.VerifyHashedPassword(desk, (await db.Users.SingleAsync(u => u.Id == desk.Id)).PasswordHash,
                "a-different-password"));
    }

    [Fact]
    public async Task PreviousRoutes_AreAbsentFromTheNewOpenApiDocument()
    {
        await using var app = TestApp.Create("Development");
        var json = await app.CreateClient().GetStringAsync("/swagger/v1/swagger.json");
        using var document = JsonDocument.Parse(json);
        var paths = document.RootElement.GetProperty("paths");

        Assert.True(paths.TryGetProperty("/api/departments", out _));
        Assert.False(paths.TryGetProperty("/api/Department/ViewDepartment", out _));
        Assert.False(paths.TryGetProperty("/api/Users/reset-password", out _));
    }

    private static async Task<HttpClient> SignedInAsync(
        Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program> app, string name)
    {
        var response = await app.CreateClient().PostAsJsonAsync("/api/Auth/login", new { name, password = Password });
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        var client = app.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", result.GetProperty("token").GetString());
        return client;
    }
}
