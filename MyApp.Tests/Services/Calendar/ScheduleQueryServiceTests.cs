using HospitalSystem.Interface;
using HospitalSystem.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using HospitalSystem.Interface.Calendar;


namespace HospitalSystem.Tests;

public class ScheduleQueryServiceTests
{
    private ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
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
        return new ScheduleQueryService(db, currentUserMock.Object);
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
        Assert.Equal("Not allowed to list deparments", result.Error);
    }
}