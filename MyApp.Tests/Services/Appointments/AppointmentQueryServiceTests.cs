namespace HospitalSystem.Services.Appointments;
using Xunit;
 
public class AppointmentQueryServiceTests : AppointmentTestBase
{
    private AppointmentQueryService CreateService(ApplicationDbContext db, bool isFrontDesk = true, bool isDemoFrontDesk = false)
        => new(db, CreateCurrentUser(isFrontDesk, isDemoFrontDesk));
 
    [Fact]
    public async Task GetAppointmentsAsync_FrontDesk_Succeeds()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
        var expectedTime = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);
 
        var result = await service.GetAppointmentsAsync();
 
        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Data.Count);
 
        Assert.Contains(result.Data, a =>
            a.AppointmentId == 1 &&
            a.Status == AppointmentStatus.Scheduled &&
            a.DoctorName == "Dr. Test" &&
            a.PatientName == "Patient One" &&
            a.AppointmentTime == expectedTime);
 
        Assert.Contains(result.Data, a =>
            a.AppointmentId == 2 &&
            a.Status == AppointmentStatus.Completed &&
            a.PatientName == "Patient Two");
 
        Assert.Contains(result.Data, a =>
            a.AppointmentId == 3 &&
            a.Status == AppointmentStatus.Cancelled &&
            a.PatientName == "Patient Three");
    }
 
    [Fact]
    public async Task GetAppointmentsAsync_NotFrontDesk_Fails()
    {
        using var db = CreateDbContext();
        var service = CreateService(db, isFrontDesk: false);
 
        var result = await service.GetAppointmentsAsync();
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Not allowed to list appointments", result.Error);
    }
 
    [Fact]
    public async Task GetAppointmentsAsync_DemoFrontDesk_Succeeds()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db, isFrontDesk: false, isDemoFrontDesk: true);
 
        var result = await service.GetAppointmentsAsync();
 
        Assert.True(result.IsSuccess);
    }
}
