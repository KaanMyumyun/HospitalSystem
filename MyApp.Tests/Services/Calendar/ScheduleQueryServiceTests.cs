using HospitalSystem.Interfaces;
using HospitalSystem.Services;
using HospitalSystem.Services.Calendar;
using Microsoft.EntityFrameworkCore;
using Moq;
using HospitalSystem.Interfaces.Calendar;


namespace HospitalSystem.Tests;

public class ScheduleQueryServiceTests
{
    private ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new ApplicationDbContext(options);
    }

    private ScheduleQueryService CreateService(ApplicationDbContext db, bool isAdmin = true)
    {
        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.IsInRole(UserRole.Admin)).Returns(isAdmin);
        currentUserMock.Setup(x => x.IsInRole(UserRole.FrontDesk)).Returns(false);
        currentUserMock.Setup(x => x.IsInRole(UserRole.DemoAdmin)).Returns(false);
        currentUserMock.Setup(x => x.IsInRole(UserRole.DemoFrontDesk)).Returns(false);
        return new ScheduleQueryService(db, currentUserMock.Object, TestClinic.Utc());
    }

    [Fact]
    public async Task ViewScheduleAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        var todayUtc = DateTime.UtcNow.Date;
        db.Calendars.AddRange(
            new CalendarEntity { Id = 1, DoctorId = 1, SlotDurationMin = 30, StartTime = todayUtc.AddDays(1).AddHours(8), EndTime = todayUtc.AddDays(1).AddHours(16) },
            new CalendarEntity { Id = 2, DoctorId = 2, SlotDurationMin = 15, StartTime = todayUtc.AddDays(2).AddHours(9), EndTime = todayUtc.AddDays(2).AddHours(13) },
            new CalendarEntity { Id = 3, DoctorId = 3, SlotDurationMin = 60, StartTime = todayUtc.AddDays(3).AddHours(10), EndTime = todayUtc.AddDays(3).AddHours(18) }
        );
        await db.SaveChangesAsync();

        var service = CreateService(db, isAdmin: true);
        var result = await service.ViewScheduleAsync();

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal(3, result.Data.Count);
        Assert.Contains(result.Data, c => c.ScheduleId == 1 && c.DoctorId == 1 && c.SlotDurationMin == 30);
        Assert.Contains(result.Data, c => c.ScheduleId == 2 && c.DoctorId == 2 && c.SlotDurationMin == 15);
        Assert.Contains(result.Data, c => c.ScheduleId == 3 && c.DoctorId == 3 && c.SlotDurationMin == 60);
    }

    [Fact]
    public async Task ViewScheduleAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);
        var result = await service.ViewScheduleAsync();

        Assert.False(result.IsSuccess);
        Assert.Equal("Not allowed to list schedules", result.Error);
        Assert.Equal(FailureKind.Forbidden, result.Failure);
    }

    // Time off that has ended is history; the list carries what is still to
    // come or under way, soonest first.
    [Fact]
    public async Task ViewScheduleAsync_IncludesTheBreakAndTimeOffNotYetOver()
    {
        var db = CreateDbContext();
        db.Calendars.Add(new CalendarEntity { Id = 1, DoctorId = 1, SlotDurationMin = 30, BreakStartMinute = 720, BreakEndMinute = 780 });
        db.TimeOff.AddRange(
            new TimeOffEntity { Id = 1, CalendarId = 1, FirstDay = new DateOnly(2026, 1, 5), LastDay = new DateOnly(2026, 1, 9) },
            new TimeOffEntity { Id = 2, CalendarId = 1, FirstDay = new DateOnly(2026, 3, 9), LastDay = new DateOnly(2026, 3, 13), Reason = "Conference" },
            new TimeOffEntity { Id = 3, CalendarId = 1, FirstDay = new DateOnly(2026, 2, 27), LastDay = new DateOnly(2026, 3, 2) });
        await db.SaveChangesAsync();
        var admin = new Mock<ICurrentUserService>();
        admin.Setup(x => x.IsInRole(UserRole.Admin)).Returns(true);
        var today = new FixedClock(new DateTimeOffset(2026, 3, 2, 9, 0, 0, TimeSpan.Zero));
        var service = new ScheduleQueryService(db, admin.Object, TestClinic.Utc(today));

        var schedule = Assert.Single((await service.ViewScheduleAsync()).Data!);

        Assert.Equal((720, 780), (schedule.BreakStartMinute, schedule.BreakEndMinute));
        Assert.Equal([3, 2], schedule.TimeOff.Select(t => t.TimeOffId));
        Assert.Equal("Conference", schedule.TimeOff[1].Reason);
    }
}
