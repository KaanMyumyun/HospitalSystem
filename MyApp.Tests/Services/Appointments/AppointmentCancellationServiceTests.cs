using HospitalSystem.Services.Appointments;
using Xunit;
 
public class AppointmentCancellationServiceTests : AppointmentTestBase
{
    private AppointmentCancellationService CreateService(ApplicationDbContext db, bool isFrontDesk = true)
        => new(db, CreateCurrentUser(isFrontDesk));
 
    [Fact]
    public async Task CancelAppointmentAsync_FrontDesk_Succeeds()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
 
        var dto = new CancelAppointmentDto { AppointmentId = 1, Reason = "Patient requested cancellation" };
 
        var result = await service.CancelAppointmentAsync(dto);
 
        Assert.True(result.IsSuccess);
 
        var updated = await db.Appointments.FindAsync(1);
        Assert.Equal(AppointmentStatus.Cancelled, updated!.Status);
        Assert.Equal("Patient requested cancellation", updated.CancellationReason);
        Assert.NotNull(updated.CancelledAt);
    }
 
    [Fact]
    public async Task CancelAppointmentAsync_NotFrontDesk_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db, isFrontDesk: false);
 
        var dto = new CancelAppointmentDto { AppointmentId = 1, Reason = "Should fail" };
 
        var result = await service.CancelAppointmentAsync(dto);
 
        Assert.False(result.IsSuccess);
        Assert.Equal("You are not allowed to cancel appointments", result.Error);
    }
 
    [Fact]
    public async Task CancelAppointmentAsync_EmptyReason_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
 
        var dto = new CancelAppointmentDto { AppointmentId = 1, Reason = "" };
 
        var result = await service.CancelAppointmentAsync(dto);
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Cancellation reason is required", result.Error);
    }
 
    [Fact]
    public async Task CancelAppointmentAsync_NotFound_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
 
        var dto = new CancelAppointmentDto { AppointmentId = 999, Reason = "Valid reason" };
 
        var result = await service.CancelAppointmentAsync(dto);
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Appointment not found", result.Error);
    }
 
    [Fact]
    public async Task CancelAppointmentAsync_AlreadyCancelled_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
 
        var dto = new CancelAppointmentDto { AppointmentId = 3, Reason = "Trying again" };
 
        var result = await service.CancelAppointmentAsync(dto);
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Appointment already canceled", result.Error);
    }
}
