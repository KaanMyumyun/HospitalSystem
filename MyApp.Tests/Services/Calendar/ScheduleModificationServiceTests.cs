using HospitalSystem.Interface;
using HospitalSystem.Services;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace HospitalSystem.Tests;

public class ScheduleModificationServiceTests
{
    private ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private ScheduleModificationService CreateService(ApplicationDbContext db, bool isAdmin = true)
    {
        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.IsInRole(UserRole.Admin)).Returns(isAdmin);
        return new ScheduleModificationService(db, currentUserMock.Object);
    }

    [Fact]
    public async Task ChangeSchedule_NotAdmin_fail()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);
        var dto = new ChangeScheduleDto { ScheduleId = 1 };
        var result = await service.ChangeScheduleAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("You are not allowed to change a schedule", result.Error);
    }

    [Fact]
    public async Task ChangeSchedule_Fails_DoesntExist()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: true);
        var dto = new ChangeScheduleDto { ScheduleId = 99 };
        var result = await service.ChangeScheduleAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Schedule not found", result.Error);
    }

    [Fact]
    public async Task ChangeSchedule_Fails_Starts_BeforeEnd()
    {
        var db = CreateDbContext();
        db.Calendars.Add(new CalendarEntity { Id = 1, DoctorId = 1 });
        await db.SaveChangesAsync();

        var service = CreateService(db, isAdmin: true);
        var dto = new ChangeScheduleDto { ScheduleId = 1, StartHour = 14, EndHour = 10 };
        var result = await service.ChangeScheduleAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Start hour must be before end hour", result.Error);
    }

    [Fact]
    public async Task ChangeSchedule_Schedule_AlreadyExist()
    {
        var db = CreateDbContext();
        var today = DateTime.UtcNow.Date;
        db.Calendars.AddRange(
            new CalendarEntity { Id = 1, DoctorId = 1, StartTime = today.AddHours(8), EndTime = today.AddHours(12) },
            new CalendarEntity { Id = 2, DoctorId = 1, StartTime = today.AddHours(13), EndTime = today.AddHours(17) }
        );
        await db.SaveChangesAsync();

        var service = CreateService(db, isAdmin: true);
        var dto = new ChangeScheduleDto { ScheduleId = 1, StartHour = 14, EndHour = 18, SlotDurationMin = 30 };
        var result = await service.ChangeScheduleAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Schedule already exists for this time range", result.Error);
    }

    [Fact]
    public async Task ChangeSchedule_HappyPaths()
    {
        var db = CreateDbContext();
        var today = DateTime.UtcNow.Date;
        db.Calendars.Add(new CalendarEntity { Id = 1, DoctorId = 1, StartTime = today.AddHours(8), EndTime = today.AddHours(12), SlotDurationMin = 15 });
        await db.SaveChangesAsync();

        var service = CreateService(db, isAdmin: true);
        var dto = new ChangeScheduleDto { ScheduleId = 1, StartHour = 9, EndHour = 14, SlotDurationMin = 30 };
        var result = await service.ChangeScheduleAsync(dto);

        Assert.True(result.IsSuccess);
        var updatedCalendar = await db.Calendars.FindAsync(1);
        Assert.Equal(today.AddHours(9), updatedCalendar.StartTime);
        Assert.Equal(today.AddHours(14), updatedCalendar.EndTime);
        Assert.Equal(30, updatedCalendar.SlotDurationMin);
    }
}