using HospitalSystem.Interfaces;
using HospitalSystem.Services;
using HospitalSystem.Services.Auth;
using HospitalSystem.Services.Calendar;
using HospitalSystem.Services.Department;
using HospitalSystem.Services.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Moq;

namespace HospitalSystem.Tests;

public class AffectedBookingsTests
{
    private static readonly DateTime MondayNineInSofia = new(2030, 6, 3, 6, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime MondayHalfPastNineInSofia = new(2030, 6, 3, 6, 30, 0, DateTimeKind.Utc);
    private static readonly DateTime TuesdayFourPmInSofia = new(2030, 6, 4, 13, 0, 0, DateTimeKind.Utc);

    private static ApplicationDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    private static ICurrentUserService Admin()
    {
        var mock = new Mock<ICurrentUserService>();
        mock.Setup(x => x.IsInRole(UserRole.Admin)).Returns(true);
        mock.Setup(x => x.UserId).Returns("99");
        return mock.Object;
    }

    private static async Task SeedAsync(ApplicationDbContext db)
    {
        db.Departments.Add(new DepartmentEntity { Id = 1, Name = "Cardiology", IsActive = true });
        db.Users.AddRange(
            new UserEntity { Id = 1, Name = "drhouse", PasswordHash = "x", Role = UserRole.Doctor },
            new UserEntity { Id = 5, Name = "desk", PasswordHash = "x", Role = UserRole.FrontDesk },
            new UserEntity { Id = 99, Name = "admin", PasswordHash = "x", Role = UserRole.Admin });
        db.Doctors.Add(new DoctorEntity { Id = 1, UserId = 1, DepartmentId = 1, IsActive = true });
        db.Calendars.Add(new CalendarEntity
        {
            Id = 1,
            DoctorId = 1,
            StartTime = new DateTime(2000, 1, 1, 8, 0, 0, DateTimeKind.Utc),
            EndTime = new DateTime(2000, 1, 1, 18, 0, 0, DateTimeKind.Utc),
            SlotDurationMin = 30
        });
        db.Patients.Add(new PatientEntity { Id = 1, Name = "Maria Ivanova", PhoneNumber = "0888111222", DateOfBirth = new DateOnly(1985, 4, 12) });
        db.Appointments.AddRange(
            Booking(10, MondayNineInSofia),
            Booking(11, TuesdayFourPmInSofia),
            Booking(12, new DateTime(2020, 6, 1, 6, 0, 0, DateTimeKind.Utc)),
            Booking(13, new DateTime(2030, 6, 5, 6, 0, 0, DateTimeKind.Utc), AppointmentStatus.Cancelled),
            Booking(14, MondayHalfPastNineInSofia));
        await db.SaveChangesAsync();
    }

    private static AppointmentEntity Booking(int id, DateTime time, AppointmentStatus status = AppointmentStatus.Scheduled) => new()
    {
        Id = id,
        DoctorId = 1,
        PatientId = 1,
        CreatedByTheFrontDeskId = 5,
        TimeOfAppointment = time,
        CreatedAt = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc),
        Status = status
    };

    private static ChangeScheduleDto Hours(int start, int end, int slot = 30) =>
        new() { ScheduleId = 1, StartHour = start, EndHour = end, SlotDurationMin = slot };

    private static ScheduleModificationService ScheduleService(ApplicationDbContext db, string clinicTimeZone = "Europe/Sofia")
    {
        var admin = Admin();
        return new(db, admin, new AuditLogService(db, admin), TestClinic.In(clinicTimeZone));
    }

    private static async Task<AppointmentStatus> StatusOf(ApplicationDbContext db, int id) =>
        (await db.Appointments.AsNoTracking().SingleAsync(a => a.Id == id)).Status;

    [Fact]
    public async Task NarrowerHours_AreRefusedWithTheBookingsOutsideThem()
    {
        using var db = CreateDbContext();
        await SeedAsync(db);

        var result = await ScheduleService(db).ChangeScheduleAsync(Hours(12, 17));

        Assert.False(result.IsSuccess);
        Assert.Equal(FailureKind.Conflict, result.Failure);
        Assert.Equal(2, result.AffectedAppointmentCount);
        Assert.NotNull(result.AffectedAppointments);
        Assert.Equal([10, 14], result.AffectedAppointments.Select(a => a.AppointmentId));
        Assert.Equal("MI", result.AffectedAppointments[0].PatientInitials);
        Assert.Equal("drhouse", result.AffectedAppointments[0].DoctorName);
        Assert.Equal(8, (await db.Calendars.AsNoTracking().SingleAsync()).StartTime.Hour);
    }

    [Fact]
    public async Task NarrowerHours_WithAReason_CancelTheBookingsOutsideThem()
    {
        using var db = CreateDbContext();
        await SeedAsync(db);
        var dto = Hours(12, 17);
        dto.CancelAffectedAppointments = true;
        dto.CancellationReason = "Doctor's hours changed";

        var result = await ScheduleService(db).ChangeScheduleAsync(dto);

        Assert.True(result.IsSuccess);
        Assert.Equal(AppointmentStatus.Cancelled, await StatusOf(db, 10));
        Assert.Equal(AppointmentStatus.Cancelled, await StatusOf(db, 14));
        Assert.Equal(AppointmentStatus.Scheduled, await StatusOf(db, 11));
        Assert.Equal("Doctor's hours changed", (await db.Appointments.SingleAsync(a => a.Id == 10)).CancellationReason);
        Assert.Equal(12, (await db.Calendars.SingleAsync()).StartTime.Hour);
        Assert.Equal(2, db.AuditLogs.Count(a => a.Action == "CancelAppointment"));
    }

    [Fact]
    public async Task CancellingWithoutAReason_ChangesNothing()
    {
        using var db = CreateDbContext();
        await SeedAsync(db);
        var dto = Hours(12, 17);
        dto.CancelAffectedAppointments = true;
        dto.CancellationReason = "  ";

        var result = await ScheduleService(db).ChangeScheduleAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("A reason is required to cancel the affected bookings", result.Error);
        Assert.Equal(AppointmentStatus.Scheduled, await StatusOf(db, 10));
        Assert.Equal(8, (await db.Calendars.AsNoTracking().SingleAsync()).StartTime.Hour);
    }

    [Theory]
    [InlineData("Europe/Sofia", true)]
    [InlineData("UTC", false)]
    public async Task HoursAreReadInTheClinicsTimeZone(string timeZone, bool fits)
    {
        using var db = CreateDbContext();
        await SeedAsync(db);

        var result = await ScheduleService(db, timeZone).ChangeScheduleAsync(Hours(9, 17));

        Assert.Equal(fits, result.IsSuccess);
    }

    [Fact]
    public async Task ANewBreak_StrandsTheBookingsInsideIt()
    {
        using var db = CreateDbContext();
        await SeedAsync(db);
        var dto = Hours(8, 18);
        dto.BreakStartMinute = 9 * 60;
        dto.BreakEndMinute = 10 * 60;

        var result = await ScheduleService(db).ChangeScheduleAsync(dto);

        Assert.Equal([10, 14], result.AffectedAppointments!.Select(a => a.AppointmentId));
        Assert.Null((await db.Calendars.AsNoTracking().SingleAsync()).BreakStartMinute);
    }

    private static TimeOffService TimeOffService(ApplicationDbContext db)
    {
        var admin = Admin();
        return new(db, admin, new AuditLogService(db, admin), TestClinic.In("Europe/Sofia"));
    }

    [Fact]
    public async Task TimeOff_StrandsThatDaysBookings_AndWithAReasonCancelsThem()
    {
        using var db = CreateDbContext();
        await SeedAsync(db);
        var monday = new DateOnly(2030, 6, 3);
        var dto = new AddTimeOffDto { ScheduleId = 1, FirstDay = monday, LastDay = monday };

        var refused = await TimeOffService(db).AddTimeOffAsync(dto);
        dto.CancelAffectedAppointments = true;
        dto.CancellationReason = "Doctor on leave";
        var added = await TimeOffService(db).AddTimeOffAsync(dto);

        Assert.Equal(FailureKind.Conflict, refused.Failure);
        Assert.Equal([10, 14], refused.AffectedAppointments!.Select(a => a.AppointmentId));
        Assert.True(added.IsSuccess, added.Error);
        Assert.Equal(AppointmentStatus.Cancelled, await StatusOf(db, 10));
        Assert.Equal(AppointmentStatus.Cancelled, await StatusOf(db, 14));
        Assert.Equal(AppointmentStatus.Scheduled, await StatusOf(db, 11));
        Assert.Equal(monday, (await db.TimeOff.SingleAsync()).FirstDay);
    }

    [Fact]
    public async Task TimeOff_DaysAreTheClinics()
    {
        using var db = CreateDbContext();
        await SeedAsync(db);
        db.Appointments.Add(Booking(15, new DateTime(2030, 6, 3, 21, 30, 0, DateTimeKind.Utc)));
        await db.SaveChangesAsync();
        var tuesday = new DateOnly(2030, 6, 4);

        var result = await TimeOffService(db).AddTimeOffAsync(new AddTimeOffDto { ScheduleId = 1, FirstDay = tuesday, LastDay = tuesday });

        Assert.Equal([15, 11], result.AffectedAppointments!.Select(a => a.AppointmentId));
    }

    [Fact]
    public async Task DroppingADay_StrandsThatDaysBookings()
    {
        using var db = CreateDbContext();
        await SeedAsync(db);
        var dto = Hours(8, 18);
        dto.WorkingDays = [DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday];

        var result = await ScheduleService(db).ChangeScheduleAsync(dto);

        Assert.Equal(2, result.AffectedAppointmentCount);
        Assert.Equal([10, 14], result.AffectedAppointments!.Select(a => a.AppointmentId));
    }

    [Fact]
    public async Task LongerSlots_StrandBookingsOffTheNewGrid()
    {
        using var db = CreateDbContext();
        await SeedAsync(db);

        var result = await ScheduleService(db).ChangeScheduleAsync(Hours(8, 18, slot: 60));

        Assert.Equal(14, Assert.Single(result.AffectedAppointments!).AppointmentId);
    }

    [Fact]
    public async Task DeactivatingTheDoctor_IsRefusedThenCancelsAllFutureBookings()
    {
        using var db = CreateDbContext();
        await SeedAsync(db);
        var admin = Admin();
        var service = new DoctorStatusService(db, admin, new AuditLogService(db, admin), new SecurityStampCache(new MemoryCache(new MemoryCacheOptions())));

        var refused = await service.ChangeDoctorsStatusAsync(new ChangeDoctorStatusDto { DoctorId = 1, IsActive = false });
        var done = await service.ChangeDoctorsStatusAsync(new ChangeDoctorStatusDto
        {
            DoctorId = 1, IsActive = false, CancelAffectedAppointments = true, CancellationReason = "Doctor left"
        });

        Assert.Equal(FailureKind.Conflict, refused.Failure);
        Assert.Equal(3, refused.AffectedAppointmentCount);
        Assert.True(done.IsSuccess);
        Assert.False((await db.Doctors.SingleAsync()).IsActive);
        Assert.Equal(3, db.Appointments.Count(a => a.Status == AppointmentStatus.Cancelled && a.CancellationReason == "Doctor left"));
        Assert.Equal(AppointmentStatus.Scheduled, await StatusOf(db, 12));
    }

    [Fact]
    public async Task DeactivatingTheDepartment_IsRefusedThenCancelsItsDoctorsBookings()
    {
        using var db = CreateDbContext();
        await SeedAsync(db);
        var admin = Admin();
        var service = new DepartmentStatusService(db, admin, new AuditLogService(db, admin));

        var refused = await service.ChangeDepartmentStatusAsync(new ChangeDepartmentStatusDto { DepartmentId = 1, IsActive = false });
        var done = await service.ChangeDepartmentStatusAsync(new ChangeDepartmentStatusDto
        {
            DepartmentId = 1, IsActive = false, CancelAffectedAppointments = true, CancellationReason = "Department closed"
        });

        Assert.Equal(3, refused.AffectedAppointmentCount);
        Assert.True(done.IsSuccess);
        Assert.False((await db.Departments.SingleAsync()).IsActive);
        Assert.Equal(3, db.Appointments.Count(a => a.CancellationReason == "Department closed"));
    }

    [Fact]
    public async Task TakingAwayTheDoctorRole_IsRefusedWhileTheDoctorHasBookings()
    {
        using var db = CreateDbContext();
        await SeedAsync(db);
        var admin = Admin();
        var service = new ChangeRoleService(db, admin, new AuditLogService(db, admin), new SecurityStampCache(new MemoryCache(new MemoryCacheOptions())));

        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 1, NewRole = UserRole.FrontDesk });

        Assert.Equal(FailureKind.Conflict, result.Failure);
        Assert.Equal(3, result.AffectedAppointmentCount);
        Assert.Equal(UserRole.Doctor, (await db.Users.AsNoTracking().SingleAsync(u => u.Id == 1)).Role);
    }
}
