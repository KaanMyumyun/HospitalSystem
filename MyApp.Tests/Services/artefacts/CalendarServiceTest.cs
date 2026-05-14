using HospitalSystem.Interface;
using HospitalSystem.Services;
using Microsoft.EntityFrameworkCore;
using Moq;

public class CalendarServiceTest
{
    private ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private CalendarService CreateService(ApplicationDbContext db, bool isAdmin = true)
    {
        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.IsInRole(UserRole.Admin)).Returns(isAdmin);
        return new CalendarService(db, currentUserMock.Object);
    }

    private async Task Seed(ApplicationDbContext db, bool isDoctorActive = true, UserRole userRole = UserRole.Doctor)
    {
        var todayUtc = DateTime.UtcNow.Date;

        db.Users.AddRange(
            new UserEntity { Id = 1, Name = "Dr Alice", PasswordHash = "hashed", Role = userRole },
            new UserEntity { Id = 2, Name = "Dr Bob", PasswordHash = "hashed", Role = userRole },
            new UserEntity { Id = 3, Name = "Dr Charlie", PasswordHash = "hashed", Role = userRole }
        );
        db.Departments.AddRange(
             new DepartmentEntity { Id = 1, Department = "Cardiology" },
             new DepartmentEntity { Id = 2, Department = "Neurology" },
             new DepartmentEntity { Id = 3, Department = "Pediatrics" }
         );

        db.Doctors.AddRange(
           new DoctorEntity { Id = 1, UserId = 1, DepartmentId = 1, IsActive = isDoctorActive },
           new DoctorEntity { Id = 2, UserId = 2, DepartmentId = 2, IsActive = isDoctorActive },
           new DoctorEntity { Id = 3, UserId = 3, DepartmentId = 3, IsActive = isDoctorActive }
       );

        db.Calendars.AddRange(
            new CalendarEntity { Id = 1, DoctorId = 1, SlotDurationMin = 30, StartTime = todayUtc.AddDays(1).AddHours(8), EndTime = todayUtc.AddDays(1).AddHours(16) },
            new CalendarEntity { Id = 2, DoctorId = 2, SlotDurationMin = 15, StartTime = todayUtc.AddDays(2).AddHours(9), EndTime = todayUtc.AddDays(2).AddHours(13) },
            new CalendarEntity { Id = 3, DoctorId = 3, SlotDurationMin = 60, StartTime = todayUtc.AddDays(3).AddHours(10), EndTime = todayUtc.AddDays(3).AddHours(18) }
        );

        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task ViewScheduleAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        var todayUtc = DateTime.UtcNow.Date;
        db.Calendars.AddRange(
         new CalendarEntity { Id = 1, DoctorId = 1, SlotDurationMin = 30, StartTime = todayUtc.AddDays(1).AddHours(8), EndTime = todayUtc.AddDays(1).AddHours(16) },
         new CalendarEntity { Id = 2, DoctorId = 2, SlotDurationMin = 15, StartTime = todayUtc.AddDays(2).AddHours(9), EndTime = todayUtc.AddDays(2).AddHours(13) },
         new CalendarEntity { Id = 3, DoctorId = 3, SlotDurationMin = 60, StartTime = todayUtc.AddDays(3).AddHours(10), EndTime = todayUtc.AddDays(3).AddHours(18) }
     );
        await db.SaveChangesAsync();
        var service = CreateService(db, isAdmin: true);

        var result = await service.ViewScheduleAsync();

        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Data.Count);
        Assert.Contains(result.Data, c => c.ScheduleId == 1 && c.DoctorId == 1 && c.SlotDurationMin == 30);
        Assert.Contains(result.Data, c => c.ScheduleId == 2 && c.DoctorId == 2 && c.SlotDurationMin == 15);
        Assert.Contains(result.Data, c => c.ScheduleId == 3 && c.DoctorId == 3 && c.SlotDurationMin == 60);
    }

    [Fact]
    public async Task ViewScheduleAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);

        var result = await service.ViewScheduleAsync();

        Assert.False(result.IsSuccess);
        Assert.Equal("Not allowed to list deparments", result.Error);
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
        db.Calendars.AddRange(new CalendarEntity { Id = 1, DoctorId = 1, StartTime = today.AddHours(8), EndTime = today.AddHours(12) }, new CalendarEntity { Id = 2, DoctorId = 1, StartTime = today.AddHours(13), EndTime = today.AddHours(17) });
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

