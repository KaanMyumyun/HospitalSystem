using HospitalSystem.Interfaces;
using HospitalSystem.Services;
using HospitalSystem.Services.Calendar;
using Microsoft.EntityFrameworkCore;
using Moq;
using HospitalSystem.Interfaces.Calendar;


namespace HospitalSystem.Tests;

public class ScheduleModificationServiceTests
{
    private ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new ApplicationDbContext(options);
    }

    private ScheduleModificationService CreateService(ApplicationDbContext db, bool isAdmin = true)
    {
        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.IsInRole(UserRole.Admin)).Returns(isAdmin);
        return new ScheduleModificationService(db, currentUserMock.Object, new AuditLogService(db, currentUserMock.Object));
    }

    private async Task SeedDoctorAsync(ApplicationDbContext db)
    {
        db.Departments.Add(new DepartmentEntity { Id = 1, Name = "Pediatrics", IsActive = true });
        db.Users.Add(new UserEntity { Id = 1, Name = "Doctor", PasswordHash = "hashed", Role = UserRole.Doctor });
        db.Doctors.Add(new DoctorEntity { Id = 1, DepartmentId = 1, UserId = 1, IsActive = true });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task ChangeSchedule_NotAdmin_fail()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);
        var dto = new ChangeScheduleDto { TimeZone = "UTC", ScheduleId = 1 };
        var result = await service.ChangeScheduleAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("You are not allowed to change a schedule", result.Error);
        Assert.Equal(FailureKind.Forbidden, result.Failure);
    }

    [Fact]
    public async Task ChangeSchedule_Fails_DoesntExist()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: true);
        var dto = new ChangeScheduleDto { TimeZone = "UTC", ScheduleId = 99 };
        var result = await service.ChangeScheduleAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Schedule not found", result.Error);
        Assert.Equal(FailureKind.NotFound, result.Failure);
    }

    [Fact]
    public async Task ChangeSchedule_Fails_Starts_BeforeEnd()
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db);
        db.Calendars.Add(new CalendarEntity { Id = 1, DoctorId = 1 });
        await db.SaveChangesAsync();

        var service = CreateService(db, isAdmin: true);
        var dto = new ChangeScheduleDto { TimeZone = "UTC", ScheduleId = 1, StartHour = 14, EndHour = 10 };
        var result = await service.ChangeScheduleAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Start hour must be before end hour", result.Error);
    }

    [Fact]
    public async Task ChangeSchedule_InactiveDoctor_Fails()
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db);
        (await db.Doctors.FindAsync(1))!.IsActive = false;
        db.Calendars.Add(new CalendarEntity { Id = 1, DoctorId = 1 });
        await db.SaveChangesAsync();

        var service = CreateService(db, isAdmin: true);
        var dto = new ChangeScheduleDto { TimeZone = "UTC", ScheduleId = 1, StartHour = 9, EndHour = 14, SlotDurationMin = 30 };
        var result = await service.ChangeScheduleAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Cannot schedule an inactive doctor", result.Error);
    }

    [Fact]
    public async Task ChangeSchedule_InactiveDepartment_Fails()
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db);
        (await db.Departments.FindAsync(1))!.IsActive = false;
        db.Calendars.Add(new CalendarEntity { Id = 1, DoctorId = 1 });
        await db.SaveChangesAsync();

        var service = CreateService(db, isAdmin: true);
        var dto = new ChangeScheduleDto { TimeZone = "UTC", ScheduleId = 1, StartHour = 9, EndHour = 14, SlotDurationMin = 30 };
        var result = await service.ChangeScheduleAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Cannot schedule a doctor in an inactive department", result.Error);
    }

    // The schedule starts out on the day it was last changed, as an older
    // release stored it; a change stores it on the date new schedules use.
    [Fact]
    public async Task ChangeSchedule_HappyPaths()
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db);
        var today = DateTime.UtcNow.Date;
        db.Calendars.Add(new CalendarEntity { Id = 1, DoctorId = 1, StartTime = today.AddHours(8), EndTime = today.AddHours(12), SlotDurationMin = 15 });
        await db.SaveChangesAsync();

        var service = CreateService(db, isAdmin: true);
        var dto = new ChangeScheduleDto { TimeZone = "UTC", ScheduleId = 1, StartHour = 9, EndHour = 14, SlotDurationMin = 30 };
        var result = await service.ChangeScheduleAsync(dto);

        Assert.True(result.IsSuccess);
        var updatedCalendar = await db.Calendars.FindAsync(1);
        Assert.NotNull(updatedCalendar);
        Assert.Equal(CalendarEntity.HoursDate.AddHours(9), updatedCalendar.StartTime);
        Assert.Equal(CalendarEntity.HoursDate.AddHours(14), updatedCalendar.EndTime);
        Assert.Equal(30, updatedCalendar.SlotDurationMin);
        Assert.Contains(db.AuditLogs, a => a.Action == "ChangeSchedule" && a.EntityId == 1);
    }

    [Fact]
    public async Task ChangeSchedule_ToMidnight_EndsAtTheStartOfTheNextDay()
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db);
        db.Calendars.Add(new CalendarEntity { Id = 1, DoctorId = 1, SlotDurationMin = 30 });
        await db.SaveChangesAsync();

        var result = await CreateService(db).ChangeScheduleAsync(
            new ChangeScheduleDto { TimeZone = "UTC", ScheduleId = 1, StartHour = 16, EndHour = 24, SlotDurationMin = 30 });

        Assert.True(result.IsSuccess, result.Error);
        var calendar = await db.Calendars.SingleAsync();
        Assert.Equal(CalendarEntity.HoursDate.AddHours(16), calendar.StartTime);
        Assert.Equal(CalendarEntity.HoursDate.AddDays(1), calendar.EndTime);
    }
}
