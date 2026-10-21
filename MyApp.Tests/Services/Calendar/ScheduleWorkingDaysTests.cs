using HospitalSystem.Interfaces;
using HospitalSystem.Services.Calendar;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace HospitalSystem.Tests;

public class ScheduleWorkingDaysTests
{
    private static ApplicationDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    private static ICurrentUserService Admin()
    {
        var mock = new Mock<ICurrentUserService>();
        mock.Setup(x => x.IsInRole(UserRole.Admin)).Returns(true);
        return mock.Object;
    }

    private static async Task SeedDoctorAsync(ApplicationDbContext db, bool withSchedule = false)
    {
        db.Departments.Add(new DepartmentEntity { Id = 1, Department = "Pediatrics", IsActive = true });
        db.Users.Add(new UserEntity { Id = 1, Name = "Doctor", PasswordHash = "hashed", Role = UserRole.Doctor });
        db.Doctors.Add(new DoctorEntity { Id = 1, DepartmentId = 1, UserId = 1, IsActive = true });
        if (withSchedule)
        {
            db.Calendars.Add(new CalendarEntity
            {
                Id = 1,
                DoctorId = 1,
                StartTime = new DateTime(2000, 1, 1, 8, 0, 0, DateTimeKind.Utc),
                EndTime = new DateTime(2000, 1, 1, 16, 0, 0, DateTimeKind.Utc),
                SlotDurationMin = 30,
                WorkingDays = [DayOfWeek.Monday, DayOfWeek.Wednesday]
            });
        }
        await db.SaveChangesAsync();
    }

    private static CreateSchedule NewSchedule(List<DayOfWeek>? days) =>
        new() { DoctorId = 1, StartHour = 8, EndHour = 16, SlotDurationMin = 30, WorkingDays = days };

    [Fact]
    public async Task CreateSchedule_WithoutDays_WorksMondayToFriday()
    {
        using var db = CreateDbContext();
        await SeedDoctorAsync(db);
        var service = new ScheduleCreationService(db, Admin(), new TestAuditLogService(db));

        var result = await service.CreateScheduleAsync(NewSchedule(null));

        Assert.True(result.IsSuccess);
        Assert.Equal(CalendarEntity.Weekdays, (await db.Calendars.SingleAsync()).WorkingDays);
    }

    [Fact]
    public async Task CreateSchedule_DaysAreStoredMondayFirstWithoutRepeats()
    {
        using var db = CreateDbContext();
        await SeedDoctorAsync(db);
        var service = new ScheduleCreationService(db, Admin(), new TestAuditLogService(db));

        var result = await service.CreateScheduleAsync(NewSchedule([DayOfWeek.Sunday, DayOfWeek.Monday, DayOfWeek.Monday]));

        Assert.True(result.IsSuccess);
        Assert.Equal([DayOfWeek.Monday, DayOfWeek.Sunday], (await db.Calendars.SingleAsync()).WorkingDays);
    }

    [Fact]
    public async Task CreateSchedule_EmptyDays_Fails()
    {
        using var db = CreateDbContext();
        await SeedDoctorAsync(db);
        var service = new ScheduleCreationService(db, Admin(), new TestAuditLogService(db));

        var result = await service.CreateScheduleAsync(NewSchedule([]));

        Assert.False(result.IsSuccess);
        Assert.Equal("Choose at least one working day", result.Error);
        Assert.Empty(db.Calendars);
    }

    [Fact]
    public async Task ChangeSchedule_WithoutDays_KeepsThem()
    {
        using var db = CreateDbContext();
        await SeedDoctorAsync(db, withSchedule: true);
        var service = new ScheduleModificationService(db, Admin(), new TestAuditLogService(db));

        var result = await service.ChangeScheduleAsync(new ChangeScheduleDto
        {
            ScheduleId = 1, StartHour = 9, EndHour = 17, SlotDurationMin = 30, TimeZone = "UTC"
        });

        Assert.True(result.IsSuccess);
        Assert.Equal([DayOfWeek.Monday, DayOfWeek.Wednesday], (await db.Calendars.SingleAsync()).WorkingDays);
    }

    [Fact]
    public async Task ChangeSchedule_NewDays_AreSaved()
    {
        using var db = CreateDbContext();
        await SeedDoctorAsync(db, withSchedule: true);
        var service = new ScheduleModificationService(db, Admin(), new TestAuditLogService(db));

        var result = await service.ChangeScheduleAsync(new ChangeScheduleDto
        {
            ScheduleId = 1, StartHour = 8, EndHour = 16, SlotDurationMin = 30, TimeZone = "UTC",
            WorkingDays = [DayOfWeek.Saturday, DayOfWeek.Tuesday]
        });

        Assert.True(result.IsSuccess);
        Assert.Equal([DayOfWeek.Tuesday, DayOfWeek.Saturday], (await db.Calendars.SingleAsync()).WorkingDays);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Mars/Olympus_Mons")]
    public async Task ChangeSchedule_WithoutAKnownTimeZone_Fails(string? timeZone)
    {
        using var db = CreateDbContext();
        await SeedDoctorAsync(db, withSchedule: true);
        var service = new ScheduleModificationService(db, Admin(), new TestAuditLogService(db));

        var result = await service.ChangeScheduleAsync(new ChangeScheduleDto
        {
            ScheduleId = 1, StartHour = 9, EndHour = 17, SlotDurationMin = 30, TimeZone = timeZone
        });

        Assert.False(result.IsSuccess);
        Assert.Equal("A valid time zone is required, such as Europe/Sofia", result.Error);
    }

    [Fact]
    public async Task ListSchedules_IncludesWorkingDays()
    {
        using var db = CreateDbContext();
        await SeedDoctorAsync(db, withSchedule: true);
        var service = new ScheduleQueryService(db, Admin());

        var result = await service.ViewScheduleAsync();

        Assert.NotNull(result.Data);
        Assert.Equal([DayOfWeek.Monday, DayOfWeek.Wednesday], Assert.Single(result.Data).WorkingDays);
    }
}
