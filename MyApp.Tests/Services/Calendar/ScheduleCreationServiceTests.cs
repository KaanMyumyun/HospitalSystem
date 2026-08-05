using HospitalSystem.Interface;
using HospitalSystem.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using HospitalSystem.Interface.Calendar;

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

    private async Task SeedDoctorAsync(ApplicationDbContext db, bool doctorActive = true, bool departmentActive = true)
    {
        db.Departments.Add(new DepartmentEntity { Id = 1, Department = "Pediatrics", IsActive = departmentActive });
        db.Users.Add(new UserEntity { Id = 1, Name = "Doctor", PasswordHash = "hashed", Role = UserRole.Doctor });
        db.Doctors.Add(new DoctorEntity { Id = 1, DepartmentId = 1, UserId = 1, IsActive = doctorActive });
        await db.SaveChangesAsync();
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
        await SeedDoctorAsync(db);
        var service = CreateService(db, isAdmin: true);
        var dto = new CreateSchedule { DoctorId = 1, StartHour = 14, EndHour = 10, SlotDurationMin = 30 };
        var result = await service.CreateScheduleAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Start hour must be before end hour", result.Error);
    }

    [Fact]
    public async Task CreateSchedule_Fails_AlreadyExist()
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db);
        var dummyDate = new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        db.Calendars.Add(new CalendarEntity { Id = 1, DoctorId = 1, StartTime = dummyDate.AddHours(8), EndTime = dummyDate.AddHours(12) });
        await db.SaveChangesAsync();

        var service = CreateService(db, isAdmin: true);
        var dto = new CreateSchedule { DoctorId = 1, StartHour = 10, EndHour = 14, SlotDurationMin = 30 };
        var result = await service.CreateScheduleAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Doctor already has a schedule. Edit the existing schedule instead", result.Error);
    }

    [Fact]
    public async Task CreateSchedule_HappyPaths()
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db);
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

    [Theory]
    [InlineData(4, "Slot duration must be between 5 and 120 minutes")]
    [InlineData(121, "Slot duration must be between 5 and 120 minutes")]
    [InlineData(50, "Slot duration must fit evenly inside the schedule window")]
    public async Task CreateSchedule_InvalidSlotDuration_Fails(int slotDuration, string expectedError)
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db);
        var service = CreateService(db, isAdmin: true);

        var result = await service.CreateScheduleAsync(new CreateSchedule { DoctorId = 1, StartHour = 9, EndHour = 17, SlotDurationMin = slotDuration });

        Assert.False(result.IsSuccess);
        Assert.Equal(expectedError, result.Error);
    }

    [Fact]
    public async Task CreateSchedule_InactiveDoctor_Fails()
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db, doctorActive: false);
        var service = CreateService(db, isAdmin: true);

        var result = await service.CreateScheduleAsync(new CreateSchedule { DoctorId = 1, StartHour = 9, EndHour = 17, SlotDurationMin = 30 });

        Assert.False(result.IsSuccess);
        Assert.Equal("Cannot schedule an inactive doctor", result.Error);
    }

    [Fact]
    public async Task CreateSchedule_InactiveDepartment_Fails()
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db, departmentActive: false);
        var service = CreateService(db, isAdmin: true);

        var result = await service.CreateScheduleAsync(new CreateSchedule { DoctorId = 1, StartHour = 9, EndHour = 17, SlotDurationMin = 30 });

        Assert.False(result.IsSuccess);
        Assert.Equal("Cannot schedule a doctor in an inactive department", result.Error);
    }
}
