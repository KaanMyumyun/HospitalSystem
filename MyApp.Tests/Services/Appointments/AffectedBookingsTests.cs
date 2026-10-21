using HospitalSystem.Interfaces;
using HospitalSystem.Services.Auth;
using HospitalSystem.Services.Calendar;
using HospitalSystem.Services.Deparment;
using HospitalSystem.Services.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Moq;

namespace HospitalSystem.Tests;

// A schedule change, or a doctor or department going inactive, must not
// strand future bookings without telling the admin.
public class AffectedBookingsTests
{
    // Monday 3 June 2030. Sofia is at UTC+3 then, so 06:00 UTC is 09:00 there.
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

    // Doctor 1 works 08:00-18:00 Sofia time in 30-minute slots, Monday to
    // Friday, with three future bookings, one past one and one cancelled.
    private static async Task SeedAsync(ApplicationDbContext db)
    {
        db.Departments.Add(new DepartmentEntity { Id = 1, Department = "Cardiology", IsActive = true });
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

    private static AppointmentsEntity Booking(int id, DateTime time, AppointmentStatus status = AppointmentStatus.Scheduled) => new()
    {
        Id = id,
        DoctorId = 1,
        PatientId = 1,
        CreatedByTheFrontDeskId = 5,
        TimeOfAppointment = time,
        CreatedAt = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc),
        Status = status
    };

    private static ChangeScheduleDto Hours(int start, int end, int slot = 30, string timeZone = "Europe/Sofia") =>
        new() { ScheduleId = 1, StartHour = start, EndHour = end, SlotDurationMin = slot, TimeZone = timeZone };

    private static ScheduleModificationService ScheduleService(ApplicationDbContext db) =>
        new(db, Admin(), new TestAuditLogService(db));

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

    // Bookings are compared as wall-clock times where the admin is: 06:00 UTC
    // is 09:00 in Sofia, inside 09:00-17:00 there but not in UTC.
    [Theory]
    [InlineData("Europe/Sofia", true)]
    [InlineData("UTC", false)]
    public async Task HoursAreReadInTheAdminsTimeZone(string timeZone, bool fits)
    {
        using var db = CreateDbContext();
        await SeedAsync(db);

        var result = await ScheduleService(db).ChangeScheduleAsync(Hours(9, 17, timeZone: timeZone));

        Assert.Equal(fits, result.IsSuccess);
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

    // With hour-long slots from 08:00, 09:30 is no longer the start of a slot.
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
        var service = new DoctorStatusService(db, Admin(), new TestAuditLogService(db), new SecurityStampCache(new MemoryCache(new MemoryCacheOptions())));

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
        var service = new DepartmentStatusService(db, Admin(), new TestAuditLogService(db));

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
        var service = new ChangeRoleService(db, Admin(), new TestAuditLogService(db), new SecurityStampCache(new MemoryCache(new MemoryCacheOptions())));

        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 1, NewRole = UserRole.FrontDesk });

        Assert.Equal(FailureKind.Conflict, result.Failure);
        Assert.Equal(3, result.AffectedAppointmentCount);
        Assert.Equal(UserRole.Doctor, (await db.Users.AsNoTracking().SingleAsync(u => u.Id == 1)).Role);
    }
}
