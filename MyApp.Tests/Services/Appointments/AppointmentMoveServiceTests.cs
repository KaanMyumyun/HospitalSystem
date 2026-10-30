using HospitalSystem.Services;
using HospitalSystem.Services.Appointments;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Tests;

public class AppointmentMoveServiceTests : AppointmentTestBase
{
    private static readonly DateTime FridayEleven = new(2026, 1, 2, 11, 0, 0, DateTimeKind.Utc);

    private AppointmentMoveService CreateService(ApplicationDbContext db, bool isFrontDesk = true)
    {
        var desk = CreateCurrentUser(isFrontDesk);
        var clock = CreateClock();
        return new(db, desk, new AuditLogService(db, desk), clock, TestClinic.Utc(clock));
    }

    private static MoveAppointmentDto MoveTo(DateTime time, int appointmentId = 1, int? doctorId = null) =>
        new() { AppointmentId = appointmentId, AppointmentTime = time, DoctorId = doctorId };

    private static async Task SeedSecondDoctorAsync(ApplicationDbContext db)
    {
        var user = new UserEntity { Id = 2, Name = "Dr. Two", PasswordHash = "x", Role = UserRole.Doctor };
        db.Users.Add(user);
        db.Doctors.Add(new DoctorEntity { Id = 2, UserId = 2, User = user, DepartmentId = 1, IsActive = true });
        db.Calendars.Add(new CalendarEntity
        {
            Id = 2,
            DoctorId = 2,
            StartTime = new DateTime(2000, 1, 1, 8, 0, 0, DateTimeKind.Utc),
            EndTime = new DateTime(2000, 1, 1, 18, 0, 0, DateTimeKind.Utc),
            SlotDurationMin = 30
        });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Move_ToAnotherTime_ChangesTheBookingAndAuditsIt()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db).MoveAsync(MoveTo(FridayEleven));

        Assert.True(result.IsSuccess, result.Error);
        var moved = await db.Appointments.SingleAsync(a => a.Id == 1);
        Assert.Equal(FridayEleven, moved.TimeOfAppointment);
        Assert.Equal(1, moved.DoctorId);
        Assert.Equal(AppointmentStatus.Scheduled, moved.Status);
        var entry = Assert.Single(db.AuditLogs, a => a.Action == "MoveAppointment");
        Assert.Equal(1, entry.EntityId);
        Assert.Equal("Moved appointment 1 from 2026-01-01 10:00 to 2026-01-02 11:00", entry.Details);
        Assert.Equal("Front Desk Admin", entry.ActorName);
    }

    [Fact]
    public async Task Move_ToAnotherDoctor_NamesBothInTheAuditEntry()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        await SeedSecondDoctorAsync(db);

        var result = await CreateService(db).MoveAsync(MoveTo(FridayEleven, doctorId: 2));

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(2, (await db.Appointments.SingleAsync(a => a.Id == 1)).DoctorId);
        Assert.EndsWith(", from Dr. Test to Dr. Two", db.AuditLogs.Single(a => a.Action == "MoveAppointment").Details);
    }

    [Fact]
    public async Task Move_OverlappingItsOwnSlot_IsAllowed()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db).MoveAsync(MoveTo(new DateTime(2026, 1, 1, 10, 15, 0, DateTimeKind.Utc)));

        Assert.True(result.IsSuccess, result.Error);
    }

    [Fact]
    public async Task Move_OntoAnotherBooking_IsAConflict()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        db.Appointments.Add(new AppointmentEntity
        {
            Id = 4, Status = AppointmentStatus.Scheduled, DoctorId = 1, PatientId = 2, CreatedByTheFrontDeskId = 5,
            TimeOfAppointment = FridayEleven, CreatedAt = Now.UtcDateTime
        });
        await db.SaveChangesAsync();

        var result = await CreateService(db).MoveAsync(MoveTo(FridayEleven));

        Assert.Equal(FailureKind.Conflict, result.Failure);
        Assert.Equal("Doctor already booked for that time slot", result.Error);
        Assert.Equal(new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc), (await db.Appointments.SingleAsync(a => a.Id == 1)).TimeOfAppointment);
    }

    [Theory]
    [InlineData(2)]
    [InlineData(3)]
    public async Task Move_AnAppointmentThatIsNotScheduled_IsRefused(int appointmentId)
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db).MoveAsync(MoveTo(FridayEleven, appointmentId));

        Assert.Equal("Only scheduled appointments can be moved", result.Error);
    }

    [Fact]
    public async Task Move_AnAppointmentThatHasStarted_IsRefused()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        db.Appointments.Add(new AppointmentEntity
        {
            Id = 4, Status = AppointmentStatus.Scheduled, DoctorId = 1, PatientId = 2, CreatedByTheFrontDeskId = 5,
            TimeOfAppointment = Now.UtcDateTime.AddHours(-1), CreatedAt = Now.UtcDateTime.AddDays(-1)
        });
        await db.SaveChangesAsync();

        var result = await CreateService(db).MoveAsync(MoveTo(FridayEleven, appointmentId: 4));

        Assert.Equal("Past appointments cannot be moved", result.Error);
    }

    [Fact]
    public async Task Move_IntoThePast_IsRefused()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db).MoveAsync(MoveTo(Now.UtcDateTime.AddHours(-1)));

        Assert.Equal("Appointments cannot be booked in the past", result.Error);
    }

    [Fact]
    public async Task Move_ToTheTimeItIsAlreadyAt_IsRefused()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db).MoveAsync(MoveTo(new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc)));

        Assert.Equal("The appointment is already at that time", result.Error);
    }

    [Fact]
    public async Task Move_IntoABreakOrADayOff_IsRefused()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var calendar = await db.Calendars.SingleAsync(c => c.Id == 1);
        calendar.BreakStartMinute = 12 * 60;
        calendar.BreakEndMinute = 13 * 60;
        db.TimeOff.Add(new TimeOffEntity { CalendarId = 1, FirstDay = new DateOnly(2026, 1, 5), LastDay = new DateOnly(2026, 1, 9) });
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var intoBreak = await service.MoveAsync(MoveTo(new DateTime(2026, 1, 2, 12, 30, 0, DateTimeKind.Utc)));
        var intoDayOff = await service.MoveAsync(MoveTo(new DateTime(2026, 1, 6, 10, 0, 0, DateTimeKind.Utc)));

        Assert.Equal("Appointment time falls in the doctor's break, 12:00-13:00", intoBreak.Error);
        Assert.Equal("The doctor is away on 2026-01-06", intoDayOff.Error);
    }

    [Fact]
    public async Task Move_ByAnyoneButTheFrontDesk_IsForbidden()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db, isFrontDesk: false).MoveAsync(MoveTo(FridayEleven));

        Assert.Equal(FailureKind.Forbidden, result.Failure);
    }

    [Fact]
    public async Task Move_AnAppointmentThatDoesNotExist_IsNotFound()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db).MoveAsync(MoveTo(FridayEleven, appointmentId: 99));

        Assert.Equal(FailureKind.NotFound, result.Failure);
    }
}
