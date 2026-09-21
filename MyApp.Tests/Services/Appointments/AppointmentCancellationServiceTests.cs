using HospitalSystem.Services.Appointments;
using Xunit;

namespace HospitalSystem.Tests;
 
public class AppointmentCancellationServiceTests : AppointmentTestBase
{
    private AppointmentCancellationService CreateService(ApplicationDbContext db, bool isFrontDesk = true)
        => new(db, CreateCurrentUser(isFrontDesk), new TestAuditLogService(db));
 
    [Fact]
    public async Task CancelAppointmentAsync_FrontDesk_Succeeds()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        await MoveToFutureAsync(db, appointmentId: 1);
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

    [Fact]
    public async Task CancelAppointmentAsync_Completed_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        await MoveToFutureAsync(db, appointmentId: 2);
        var service = CreateService(db);

        var result = await service.CancelAppointmentAsync(new CancelAppointmentDto { AppointmentId = 2, Reason = "Valid reason" });

        Assert.False(result.IsSuccess);
        Assert.Equal("Only scheduled appointments can be cancelled", result.Error);
        Assert.Equal(AppointmentStatus.Completed, (await db.Appointments.FindAsync(2))!.Status);
    }

    [Fact]
    public async Task CancelAppointmentAsync_PastAppointment_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        // Seeded appointment 1 is Scheduled on 2026-01-01, which is in the past.
        var result = await service.CancelAppointmentAsync(new CancelAppointmentDto { AppointmentId = 1, Reason = "Valid reason" });

        Assert.False(result.IsSuccess);
        Assert.Equal("Past appointments cannot be cancelled", result.Error);
        Assert.Equal(AppointmentStatus.Scheduled, (await db.Appointments.FindAsync(1))!.Status);
    }

    private static async Task MoveToFutureAsync(ApplicationDbContext db, int appointmentId)
    {
        var appointment = await db.Appointments.FindAsync(appointmentId);
        appointment!.TimeOfAppointment = DateTime.UtcNow.AddDays(7);
        await db.SaveChangesAsync();
    }
}
