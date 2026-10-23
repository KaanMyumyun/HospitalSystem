using HospitalSystem.Interfaces;
using HospitalSystem.Services.Appointments;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace HospitalSystem.Tests;

// The seeded appointment 1 (Scheduled) and 2 (Completed) were on 1 January
// 2026, appointment 3 is cancelled; all belong to doctor 1, whose user is 1.
public class AppointmentStatusServiceTests : AppointmentTestBase
{
    private static ICurrentUserService User(UserRole role, int userId)
    {
        var mock = new Mock<ICurrentUserService>();
        mock.Setup(x => x.IsInRole(It.IsAny<UserRole>())).Returns<UserRole>(r => r == role);
        mock.Setup(x => x.UserId).Returns(userId.ToString());
        return mock.Object;
    }

    private static AppointmentStatusService CreateService(ApplicationDbContext db, ICurrentUserService user) =>
        new(db, user, new TestAuditLogService(db));

    private static ChangeAppointmentStatusDto Mark(int appointmentId, AppointmentStatus status) =>
        new() { AppointmentId = appointmentId, Status = status };

    [Theory]
    [InlineData(AppointmentStatus.Completed)]
    [InlineData(AppointmentStatus.NoShow)]
    public async Task Desk_MarksAPastAppointment(AppointmentStatus status)
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db, User(UserRole.FrontDesk, 5)).ChangeStatusAsync(Mark(1, status));

        Assert.True(result.IsSuccess);
        Assert.Equal(status, (await db.Appointments.SingleAsync(a => a.Id == 1)).Status);
        Assert.Contains(db.AuditLogs, a => a.Action == "ChangeAppointmentStatus" && a.EntityId == 1);
    }

    [Fact]
    public async Task Doctor_MarksTheirOwnAppointment()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db, User(UserRole.Doctor, 1)).ChangeStatusAsync(Mark(1, AppointmentStatus.Completed));

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task Doctor_CannotMarkAnotherDoctorsAppointment()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db, User(UserRole.Doctor, 42)).ChangeStatusAsync(Mark(1, AppointmentStatus.Completed));

        Assert.Equal(FailureKind.Forbidden, result.Failure);
        Assert.Equal(AppointmentStatus.Scheduled, (await db.Appointments.SingleAsync(a => a.Id == 1)).Status);
    }

    [Fact]
    public async Task CompletedCanBeCorrectedToNoShow()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db, User(UserRole.FrontDesk, 5)).ChangeStatusAsync(Mark(2, AppointmentStatus.NoShow));

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task FutureAppointment_CannotBeMarkedYet()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        (await db.Appointments.SingleAsync(a => a.Id == 1)).TimeOfAppointment = DateTime.UtcNow.AddDays(1);
        await db.SaveChangesAsync();

        var result = await CreateService(db, User(UserRole.FrontDesk, 5)).ChangeStatusAsync(Mark(1, AppointmentStatus.Completed));

        Assert.Equal("An appointment can only be marked once it has started", result.Error);
    }

    [Theory]
    [InlineData(3, AppointmentStatus.Completed, "A cancelled appointment cannot be marked")]
    [InlineData(2, AppointmentStatus.Completed, "The appointment is already marked completed")]
    [InlineData(1, AppointmentStatus.Cancelled, "An appointment can only be marked completed or no-show")]
    [InlineData(1, AppointmentStatus.Scheduled, "An appointment can only be marked completed or no-show")]
    public async Task OtherChanges_AreRefused(int appointmentId, AppointmentStatus status, string error)
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db, User(UserRole.FrontDesk, 5)).ChangeStatusAsync(Mark(appointmentId, status));

        Assert.False(result.IsSuccess);
        Assert.Equal(error, result.Error);
    }

    [Fact]
    public async Task UnknownAppointment_IsNotFound()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db, User(UserRole.FrontDesk, 5)).ChangeStatusAsync(Mark(999, AppointmentStatus.Completed));

        Assert.Equal(FailureKind.NotFound, result.Failure);
    }

    [Fact]
    public async Task Admin_CannotMarkAppointments()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db, User(UserRole.Admin, 9)).ChangeStatusAsync(Mark(1, AppointmentStatus.Completed));

        Assert.Equal(FailureKind.Forbidden, result.Failure);
    }

    [Fact]
    public async Task Doctor_ListsOnlyTheirOwnAppointments()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        db.Users.Add(new UserEntity { Id = 2, Name = "Dr. Other", PasswordHash = "x", Role = UserRole.Doctor });
        db.Doctors.Add(new DoctorEntity { Id = 2, UserId = 2, DepartmentId = 1, IsActive = true });
        db.Appointments.Add(new AppointmentEntity
        {
            Id = 20, DoctorId = 2, PatientId = 1, CreatedByTheFrontDeskId = 5, Status = AppointmentStatus.Scheduled,
            TimeOfAppointment = new DateTime(2026, 1, 1, 11, 0, 0, DateTimeKind.Utc), CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
        var service = new AppointmentQueryService(db, User(UserRole.Doctor, 1));

        var result = await service.GetMyAppointmentsAsync(new MyAppointmentsQueryDto
        {
            From = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero),
            To = new DateTimeOffset(2026, 1, 2, 0, 0, 0, TimeSpan.Zero)
        });

        Assert.NotNull(result.Data);
        Assert.Equal([1, 2, 3], result.Data.Select(a => a.AppointmentId).Order());
    }

    [Fact]
    public async Task OnlyDoctors_HaveTheirOwnAppointments()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = new AppointmentQueryService(db, User(UserRole.FrontDesk, 5));

        var result = await service.GetMyAppointmentsAsync(new MyAppointmentsQueryDto
        {
            From = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero),
            To = new DateTimeOffset(2026, 1, 2, 0, 0, 0, TimeSpan.Zero)
        });

        Assert.Equal(FailureKind.Forbidden, result.Failure);
    }
}
