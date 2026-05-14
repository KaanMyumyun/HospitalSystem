using HospitalSystem.Interface;
using HospitalSystem.Services;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace HospitalSystem.Tests;

public class ScheduleCreationServiceTests
{
    private ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private ScheduleCreationService CreateService(ApplicationDbContext db, bool isAdmin = true)
    {
        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.IsInRole(UserRole.Admin)).Returns(isAdmin);
        return new ScheduleCreationService(db, currentUserMock.Object);
    }

    [Fact]
    public async Task CreateSchedule_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);
        var dto = new CreateSchedule { DoctorId = 1 };
        var result = await service.CreateScheduleAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("You are not allowed to create a schedule", result.Error);
    }

    [Fact]
    public async Task CreateSchedule_Fails_Starts_BeforeEnd()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: true);
        var dto = new CreateSchedule { DoctorId = 1, StartHour = 14, EndHour = 10 };
        var result = await service.CreateScheduleAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Start hour must be before end hour", result.Error);
    }

    [Fact]
    public async Task CreateSchedule_Fails_AlreadyExist()
    {
        var db = CreateDbContext();
        var dummyDate = new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        db.Calendars.Add(new CalendarEntity { Id = 1, DoctorId = 1, StartTime = dummyDate.AddHours(8), EndTime = dummyDate.AddHours(12) });
        await db.SaveChangesAsync();

        var service = CreateService(db, isAdmin: true);
        var dto = new CreateSchedule { DoctorId = 1, StartHour = 10, EndHour = 14, SlotDurationMin = 30 };
        var result = await service.CreateScheduleAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Schedule already exists for this time range", result.Error);
    }

    [Fact]
    public async Task CreateSchedule_HappyPaths()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: true);
        var dto = new CreateSchedule { DoctorId = 1, StartHour = 9, EndHour = 17, SlotDurationMin = 30 };
        var result = await service.CreateScheduleAsync(dto);

        Assert.True(result.IsSuccess);
        var newCalendar = await db.Calendars.SingleAsync();
        Assert.Equal(1, newCalendar.DoctorId);
        Assert.Equal(new DateTime(2000, 1, 1, 9, 0, 0, DateTimeKind.Utc), newCalendar.StartTime);
        Assert.Equal(new DateTime(2000, 1, 1, 17, 0, 0, DateTimeKind.Utc), newCalendar.EndTime);
        Assert.Equal(30, newCalendar.SlotDurationMin);
    }
}