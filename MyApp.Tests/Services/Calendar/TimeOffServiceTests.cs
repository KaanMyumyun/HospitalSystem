using HospitalSystem.Services;
using HospitalSystem.Services.Calendar;
using Microsoft.EntityFrameworkCore;
using Moq;
using HospitalSystem.Interfaces;

namespace HospitalSystem.Tests;

// Schedule 1 is doctor 1's; "today" is 1 December 2025 (AppointmentTestBase).
public class TimeOffServiceTests : AppointmentTestBase
{
    private TimeOffService CreateService(ApplicationDbContext db, bool isAdmin = true)
    {
        var admin = new Mock<ICurrentUserService>();
        admin.Setup(x => x.IsInRole(UserRole.Admin)).Returns(isAdmin);
        admin.Setup(x => x.UserId).Returns("5");
        return new(db, admin.Object, new AuditLogService(db, admin.Object), TestClinic.Utc(CreateClock()));
    }

    private static AddTimeOffDto Days(DateOnly first, DateOnly last, string? reason = null, int scheduleId = 1) =>
        new() { ScheduleId = scheduleId, FirstDay = first, LastDay = last, Reason = reason };

    [Fact]
    public async Task Add_StoresTheDaysAndAuditsThem()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db).AddTimeOffAsync(Days(new DateOnly(2026, 1, 5), new DateOnly(2026, 1, 9), "  Holiday "));

        Assert.True(result.IsSuccess, result.Error);
        var timeOff = await db.TimeOff.SingleAsync();
        Assert.Equal((new DateOnly(2026, 1, 5), new DateOnly(2026, 1, 9), "Holiday"), (timeOff.FirstDay, timeOff.LastDay, timeOff.Reason));
        Assert.Equal("Doctor 1 away from 2026-01-05 to 2026-01-09: Holiday", db.AuditLogs.Single(a => a.Action == "AddTimeOff").Details);
    }

    [Theory]
    [InlineData("2026-01-09", "2026-01-05", "The last day cannot be before the first")]
    [InlineData("2025-11-20", "2025-11-30", "Time off cannot end in the past")]
    [InlineData("2026-01-01", "2027-01-02", "Time off can be at most a year long")]
    public async Task Add_DaysThatMakeNoSense_AreRefused(string first, string last, string expectedError)
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db).AddTimeOffAsync(Days(DateOnly.Parse(first), DateOnly.Parse(last)));

        Assert.Equal(expectedError, result.Error);
        Assert.Empty(db.TimeOff);
    }

    // Days off that began yesterday can still be recorded, as for sick leave.
    [Fact]
    public async Task Add_DaysThatBeganEarlier_AreAccepted()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db).AddTimeOffAsync(Days(new DateOnly(2025, 11, 28), new DateOnly(2025, 12, 3)));

        Assert.True(result.IsSuccess, result.Error);
    }

    [Fact]
    public async Task Add_OverlappingTimeOff_IsAConflict()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
        await service.AddTimeOffAsync(Days(new DateOnly(2026, 1, 5), new DateOnly(2026, 1, 9)));

        var result = await service.AddTimeOffAsync(Days(new DateOnly(2026, 1, 9), new DateOnly(2026, 1, 12)));

        Assert.Equal(FailureKind.Conflict, result.Failure);
        Assert.Equal("This overlaps time off from 2026-01-05 to 2026-01-09", result.Error);
    }

    [Fact]
    public async Task Add_ToAScheduleThatDoesNotExist_IsNotFound()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db).AddTimeOffAsync(Days(new DateOnly(2026, 1, 5), new DateOnly(2026, 1, 9), scheduleId: 9));

        Assert.Equal(FailureKind.NotFound, result.Failure);
    }

    [Fact]
    public async Task AddAndRemove_AreForAdminsOnly()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db, isAdmin: false);

        var added = await service.AddTimeOffAsync(Days(new DateOnly(2026, 1, 5), new DateOnly(2026, 1, 9)));
        var removed = await service.RemoveTimeOffAsync(1, 1);

        Assert.Equal(FailureKind.Forbidden, added.Failure);
        Assert.Equal(FailureKind.Forbidden, removed.Failure);
    }

    [Fact]
    public async Task Remove_DeletesTheDaysAndAuditsIt()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        db.TimeOff.Add(new TimeOffEntity { Id = 7, CalendarId = 1, FirstDay = new DateOnly(2026, 1, 5), LastDay = new DateOnly(2026, 1, 9) });
        await db.SaveChangesAsync();

        var wrongSchedule = await CreateService(db).RemoveTimeOffAsync(2, 7);
        var result = await CreateService(db).RemoveTimeOffAsync(1, 7);

        Assert.Equal(FailureKind.NotFound, wrongSchedule.Failure);
        Assert.True(result.IsSuccess, result.Error);
        Assert.Empty(db.TimeOff);
        Assert.Equal("Doctor 1 no longer away from 2026-01-05 to 2026-01-09", db.AuditLogs.Single(a => a.Action == "RemoveTimeOff").Details);
    }
}
