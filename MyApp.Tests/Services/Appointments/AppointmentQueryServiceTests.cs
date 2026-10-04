using HospitalSystem.Services.Appointments;
using Xunit;

namespace HospitalSystem.Tests;

public class AppointmentQueryServiceTests : AppointmentTestBase
{
    private static readonly DateTimeOffset SeedDay = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    private AppointmentQueryService CreateService(ApplicationDbContext db, bool isFrontDesk = true, bool isDemoFrontDesk = false)
        => new(db, CreateCurrentUser(isFrontDesk, isDemoFrontDesk));

    private static AppointmentQueryDto SeedDayFor(int doctorId) =>
        new() { DoctorId = doctorId, From = SeedDay, To = SeedDay.AddDays(1) };

    private static AppointmentsEntity AppointmentAt(int id, int doctorId, DateTime time, AppointmentStatus status = AppointmentStatus.Scheduled) =>
        new() { Id = id, Status = status, DoctorId = doctorId, PatientId = 1, TimeOfAppointment = time, CreatedAt = time, CreatedByTheFrontDeskId = 5 };

    [Fact]
    public async Task GetAppointmentsAsync_FrontDesk_Succeeds()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
        var expectedTime = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);

        var result = await service.GetAppointmentsAsync(SeedDayFor(1));

        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Data.Count);

        Assert.Contains(result.Data, a =>
            a.AppointmentId == 1 &&
            a.Status == AppointmentStatus.Scheduled &&
            a.DoctorName == "Dr. Test" &&
            a.PatientName == "Patient One" &&
            a.AppointmentTime == expectedTime);

        Assert.Contains(result.Data, a =>
            a.AppointmentId == 2 &&
            a.Status == AppointmentStatus.Completed &&
            a.PatientName == "Patient Two");

        Assert.Contains(result.Data, a =>
            a.AppointmentId == 3 &&
            a.Status == AppointmentStatus.Cancelled &&
            a.PatientName == "Patient Three");
    }

    [Fact]
    public async Task GetAppointmentsAsync_ReturnsOnlyThatDoctorInsideTheWindow_InTimeOrder()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        db.Users.Add(new UserEntity { Id = 2, Name = "Dr. Other", PasswordHash = "dummy_hash", Role = UserRole.Doctor });
        db.Doctors.Add(new DoctorEntity { Id = 2, UserId = 2, DepartmentId = 1, IsActive = true });
        db.Appointments.AddRange(
            AppointmentAt(4, doctorId: 2, new DateTime(2026, 1, 1, 11, 0, 0, DateTimeKind.Utc)),
            AppointmentAt(5, doctorId: 1, new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc)),
            AppointmentAt(6, doctorId: 1, new DateTime(2025, 12, 31, 23, 59, 0, DateTimeKind.Utc)),
            AppointmentAt(7, doctorId: 1, new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)));
        await db.SaveChangesAsync();

        var result = await CreateService(db).GetAppointmentsAsync(SeedDayFor(1));

        Assert.True(result.IsSuccess);
        // From is inclusive and To exclusive; same-time rows come in id order.
        Assert.Equal(new[] { 7, 1, 2, 3 }, result.Data.Select(a => a.AppointmentId));
    }

    [Fact]
    public async Task GetAppointmentsAsync_ComparesTheWindowAsInstants()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
        var utcPlus3 = TimeSpan.FromHours(3);

        // 12:00-14:00 at UTC+3 is 09:00-11:00 UTC, around the 10:00 UTC appointments.
        var around = await service.GetAppointmentsAsync(new AppointmentQueryDto
        {
            DoctorId = 1,
            From = new DateTimeOffset(2026, 1, 1, 12, 0, 0, utcPlus3),
            To = new DateTimeOffset(2026, 1, 1, 14, 0, 0, utcPlus3)
        });
        // 09:00-11:00 at UTC+3 would contain 10:00 only if the offset were ignored.
        var wallClockOnly = await service.GetAppointmentsAsync(new AppointmentQueryDto
        {
            DoctorId = 1,
            From = new DateTimeOffset(2026, 1, 1, 9, 0, 0, utcPlus3),
            To = new DateTimeOffset(2026, 1, 1, 11, 0, 0, utcPlus3)
        });

        Assert.Equal(3, around.Data.Count);
        Assert.Empty(wallClockOnly.Data);
    }

    [Fact]
    public async Task GetAppointmentsAsync_MissingDoctorOrWindow_Fails()
    {
        using var db = CreateDbContext();
        var service = CreateService(db);

        var noDoctor = await service.GetAppointmentsAsync(new AppointmentQueryDto { From = SeedDay, To = SeedDay.AddDays(1) });
        var noEnd = await service.GetAppointmentsAsync(new AppointmentQueryDto { DoctorId = 1, From = SeedDay });

        Assert.Equal("Doctor id, from and to are required", noDoctor.Error);
        Assert.Equal("Doctor id, from and to are required", noEnd.Error);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task GetAppointmentsAsync_EndNotAfterStart_Fails(int days)
    {
        using var db = CreateDbContext();
        var service = CreateService(db);

        var result = await service.GetAppointmentsAsync(new AppointmentQueryDto { DoctorId = 1, From = SeedDay, To = SeedDay.AddDays(days) });

        Assert.False(result.IsSuccess);
        Assert.Equal("To must be after from", result.Error);
    }

    [Fact]
    public async Task GetAppointmentsAsync_WindowOverSixWeeks_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var sixWeeks = await service.GetAppointmentsAsync(new AppointmentQueryDto { DoctorId = 1, From = SeedDay, To = SeedDay.AddDays(42) });
        var longer = await service.GetAppointmentsAsync(new AppointmentQueryDto { DoctorId = 1, From = SeedDay, To = SeedDay.AddDays(42).AddMinutes(1) });

        Assert.True(sixWeeks.IsSuccess);
        Assert.False(longer.IsSuccess);
        Assert.Equal("The time window can be at most 42 days", longer.Error);
    }

    [Fact]
    public async Task GetAppointmentsAsync_NotFrontDesk_Fails()
    {
        using var db = CreateDbContext();
        var service = CreateService(db, isFrontDesk: false);

        var result = await service.GetAppointmentsAsync(SeedDayFor(1));

        Assert.False(result.IsSuccess);
        Assert.Equal("Not allowed to list appointments", result.Error);
    }

    [Fact]
    public async Task GetAppointmentsAsync_DemoFrontDesk_Succeeds()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db, isFrontDesk: false, isDemoFrontDesk: true);

        var result = await service.GetAppointmentsAsync(SeedDayFor(1));

        Assert.True(result.IsSuccess);
    }
}
