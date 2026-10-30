using HospitalSystem.Services;
using HospitalSystem.Services.Appointments;
using Microsoft.EntityFrameworkCore;
using Moq;
using Npgsql;
using Xunit;

namespace HospitalSystem.Tests;

public class AppointmentCreationServiceTests : AppointmentTestBase
{
    private AppointmentCreationService CreateService(
        ApplicationDbContext db, bool isFrontDesk = true, string? userId = "5", string clinicTimeZone = "UTC")
    {
        var desk = CreateCurrentUser(isFrontDesk, userId: userId);
        var clock = CreateClock();
        return new AppointmentCreationService(
            db, desk, new PatientService(db), new AuditLogService(db, desk), clock, TestClinic.In(clinicTimeZone, clock));
    }

    [Fact]
    public async Task CreateAppointmentAsync_NewPatient_Succeeds()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var time = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc);
        var dob = new DateOnly(2000, 1, 2);

        var dto = new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "New Patient",
            PhoneNumber = "123-4567",
            DateOfBirth = dob,
            AppointmentTime = time
        };

        var result = await service.CreateAppointmentAsync(dto);

        Assert.True(result.IsSuccess);

        var patient = await db.Patients.FirstOrDefaultAsync(p => p.PhoneNumber == "1234567");
        Assert.NotNull(patient);
        Assert.Equal("New Patient", patient!.Name);
        Assert.Equal(dob, patient.DateOfBirth);

        var appointment = await db.Appointments.FirstOrDefaultAsync(a => a.PatientId == patient.Id);
        Assert.NotNull(appointment);
        Assert.Equal(time, appointment!.TimeOfAppointment);
        Assert.Equal(AppointmentStatus.Scheduled, appointment.Status);
        Assert.Equal(5, appointment.CreatedByTheFrontDeskId);
        Assert.Null(appointment.CancelledAt);
        Assert.Equal(Now.UtcDateTime, appointment.CreatedAt);
        var entry = Assert.Single(db.AuditLogs, a => a.Action == "CreateAppointment" && a.EntityId == appointment.Id);
        Assert.Equal(5, entry.ActorUserId);
        Assert.Equal("Front Desk Admin", entry.ActorName);
    }

    [Fact]
    public async Task CreateAppointmentAsync_ExistingPatient_ReusesPatient()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var time = new DateTime(2026, 1, 1, 10, 30, 0, DateTimeKind.Utc);

        var dto = new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "Patient One",
            PhoneNumber = "555-0001",
            DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-30)),
            AppointmentTime = time
        };

        var result = await service.CreateAppointmentAsync(dto);

        Assert.True(result.IsSuccess);

        var patientCount = await db.Patients.CountAsync(p => p.PhoneNumber == "5550001");
        Assert.Equal(1, patientCount);
    }

    [Fact]
    public async Task CreateAppointmentAsync_NotFrontDesk_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db, isFrontDesk: false);

        var dto = new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "Ball",
            PhoneNumber = "235235",
            DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow),
            AppointmentTime = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc)
        };

        var result = await service.CreateAppointmentAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("You are not allowed to create appointments", result.Error);
        Assert.Equal(FailureKind.Forbidden, result.Failure);
    }

    [Fact]
    public async Task CreateAppointmentAsync_FrontDeskWithoutAUserId_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db, userId: null);

        var result = await service.CreateAppointmentAsync(new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "New Patient",
            PhoneNumber = "555-0100",
            DateOfBirth = new DateOnly(1990, 1, 1),
            AppointmentTime = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc)
        });

        Assert.Equal(FailureKind.Forbidden, result.Failure);
        Assert.Equal(3, await db.Appointments.CountAsync());
    }

    [Fact]
    public async Task CreateAppointmentAsync_DoctorNotFound_Fails()
    {
        using var db = CreateDbContext();
        var service = CreateService(db);

        var dto = new CreateAppointmentDto
        {
            DoctorId = 9999,
            PatientName = "Anyone",
            PhoneNumber = "000",
            DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow),
            AppointmentTime = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc)
        };

        var result = await service.CreateAppointmentAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Doctor not found", result.Error);
        Assert.Equal(FailureKind.NotFound, result.Failure);
    }

    [Fact]
    public async Task CreateAppointmentAsync_InactiveDoctor_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db, isDoctorActive: false);
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(NewPatientAt(new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc)));

        Assert.False(result.IsSuccess);
        Assert.Equal("Doctor is not available for booking", result.Error);
        Assert.Equal(3, await db.Appointments.CountAsync());
    }

    [Fact]
    public async Task CreateAppointmentAsync_ActiveDoctorWithoutDoctorRole_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        (await db.Users.FindAsync(1))!.Role = UserRole.FrontDesk;
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(NewPatientAt(new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc)));

        Assert.False(result.IsSuccess);
        Assert.Equal("Doctor is not available for booking", result.Error);
        Assert.Equal(3, await db.Appointments.CountAsync());
    }

    private static CreateAppointmentDto NewPatientAt(DateTime time) => new()
    {
        DoctorId = 1,
        PatientName = "New Patient",
        PhoneNumber = "555-9000",
        DateOfBirth = new DateOnly(1990, 1, 1),
        AppointmentTime = time
    };

    [Fact]
    public async Task CreateAppointmentAsync_OverlappingTime_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var dto = new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "New Patient",
            PhoneNumber = "123-4567",
            DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-20)),
            AppointmentTime = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc)
        };

        var result = await service.CreateAppointmentAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Doctor already booked for that time slot", result.Error);
        Assert.True(result.IsConflict);
    }

    [Fact]
    public async Task CreateAppointmentAsync_UniqueIndexViolation_ReturnsConflict()
    {
        using var db = new FailingAppointmentInsertDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
        db.AppointmentInsertException = new DbUpdateException(
            "unique violation",
            new PostgresException("duplicate key", "ERROR", "ERROR", PostgresErrorCodes.UniqueViolation));

        var dto = new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "Racing Patient",
            PhoneNumber = "555-1100",
            DateOfBirth = new DateOnly(1990, 1, 1),
            AppointmentTime = new DateTime(2026, 1, 1, 11, 0, 0, DateTimeKind.Utc)
        };

        var result = await service.CreateAppointmentAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.True(result.IsConflict);
        Assert.Equal("Doctor already booked for that time slot", result.Error);
        Assert.DoesNotContain(db.AuditLogs, a => a.Action == "CreateAppointment");
    }

    [Fact]
    public async Task CreateAppointmentAsync_OtherDbUpdateError_Propagates()
    {
        using var db = new FailingAppointmentInsertDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
        db.AppointmentInsertException = new DbUpdateException(
            "foreign key violation",
            new PostgresException("fk violation", "ERROR", "ERROR", PostgresErrorCodes.ForeignKeyViolation));

        var dto = new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "Racing Patient",
            PhoneNumber = "555-1100",
            DateOfBirth = new DateOnly(1990, 1, 1),
            AppointmentTime = new DateTime(2026, 1, 1, 11, 0, 0, DateTimeKind.Utc)
        };

        await Assert.ThrowsAsync<DbUpdateException>(() => service.CreateAppointmentAsync(dto));
    }

    private sealed class FailingAppointmentInsertDbContext : ApplicationDbContext
    {
        public Exception? AppointmentInsertException { get; set; }

        public FailingAppointmentInsertDbContext()
            : base(new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options)
        {
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            if (AppointmentInsertException is not null &&
                ChangeTracker.Entries<AppointmentEntity>().Any(e => e.State == EntityState.Added))
                throw AppointmentInsertException;

            return base.SaveChangesAsync(cancellationToken);
        }
    }

    [Theory]
    [InlineData("555-CALL", "Phone number must contain 7 to 15 digits and no letters")]
    [InlineData("123", "Phone number must contain 7 to 15 digits and no letters")]
    [InlineData("", "Phone number is required")]
    public async Task CreateAppointmentAsync_InvalidPhone_Fails(string phoneNumber, string expectedError)
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var dto = new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "New Patient",
            PhoneNumber = phoneNumber,
            DateOfBirth = new DateOnly(1990, 1, 1),
            AppointmentTime = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc)
        };

        var result = await service.CreateAppointmentAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal(expectedError, result.Error);
    }

    [Fact]
    public async Task CreateAppointmentAsync_MissingPatientName_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var dto = new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "",
            PhoneNumber = "555-7777",
            DateOfBirth = new DateOnly(1990, 1, 1),
            AppointmentTime = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc)
        };

        var result = await service.CreateAppointmentAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Patient name is required", result.Error);
    }

    [Fact]
    public async Task CreateAppointmentAsync_DateOfBirthAfterAppointment_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var dto = new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "New Patient",
            PhoneNumber = "555-7777",
            DateOfBirth = new DateOnly(2026, 1, 3),
            AppointmentTime = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc)
        };

        var result = await service.CreateAppointmentAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Date of birth cannot be after the appointment date", result.Error);
    }

    [Theory]
    [InlineData(9, 46, 0)]
    [InlineData(9, 59, 0)]
    [InlineData(10, 1, 0)]
    [InlineData(10, 14, 0)]
    [InlineData(11, 0, 30)]
    public async Task CreateAppointmentAsync_OffTheSlotGrid_Fails(int hour, int minute, int second)
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var dto = new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "Off Grid Patient",
            PhoneNumber = "555-0101",
            DateOfBirth = new DateOnly(1990, 1, 1),
            AppointmentTime = new DateTime(2026, 1, 1, hour, minute, second, DateTimeKind.Utc)
        };

        var result = await service.CreateAppointmentAsync(dto);

        Assert.Equal(FailureKind.Invalid, result.Failure);
        Assert.Equal("Appointment time must be the start of one of the doctor's 15-minute slots", result.Error);
        Assert.Equal(3, await db.Appointments.CountAsync());
    }

    [Theory]
    [InlineData(9, 45)]
    [InlineData(10, 15)]
    public async Task CreateAppointmentAsync_AdjacentTime_Succeeds(int hour, int minute)
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var dto = new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "Adjacent Patient",
            PhoneNumber = $"555-{hour:D2}{minute:D2}",
            DateOfBirth = new DateOnly(1990, 1, 1),
            AppointmentTime = new DateTime(2026, 1, 1, hour, minute, 0, DateTimeKind.Utc)
        };

        var result = await service.CreateAppointmentAsync(dto);

        Assert.True(result.IsSuccess);
    }

    [Theory]
    [InlineData(10, 9, 50)]
    [InlineData(10, 10, 10)]
    [InlineData(5, 9, 55)]
    [InlineData(5, 10, 5)]
    [InlineData(30, 9, 30)]
    [InlineData(30, 10, 30)]
    public async Task CreateAppointmentAsync_NextToBookingWithDoctorsSlotLength_Succeeds(int slotMinutes, int hour, int minute)
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        (await db.Calendars.FindAsync(1))!.SlotDurationMin = slotMinutes;
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(NewPatientAt(new DateTime(2026, 1, 1, hour, minute, 0, DateTimeKind.Utc)));

        Assert.True(result.IsSuccess);
    }

    [Theory]
    [InlineData(15, 10, 0)]
    [InlineData(15, 10, 15)]
    [InlineData(30, 10, 0)]
    [InlineData(30, 10, 30)]
    [InlineData(60, 10, 0)]
    [InlineData(60, 11, 0)]
    public async Task CreateAppointmentAsync_WithinDoctorsSlotLengthOfBooking_Fails(int slotMinutes, int hour, int minute)
    {
        using var db = CreateDbContext();
        await SeedOffGridBookingAsync(db, slotMinutes);
        var service = CreateService(db);
        var dto = NewPatientAt(new DateTime(2026, 1, 2, hour, minute, 0, DateTimeKind.Utc));

        var result = await service.CreateAppointmentAsync(dto);

        Assert.True(result.IsConflict);
        Assert.Equal("Doctor already booked for that time slot", result.Error);
        Assert.False(await db.Appointments.AnyAsync(a => a.TimeOfAppointment == dto.AppointmentTime));
    }

    [Theory]
    [InlineData(15, 9, 45)]
    [InlineData(15, 10, 30)]
    [InlineData(30, 9, 30)]
    [InlineData(30, 11, 0)]
    [InlineData(60, 9, 0)]
    [InlineData(60, 12, 0)]
    public async Task CreateAppointmentAsync_ASlotClearOfABookingOffTheGrid_Succeeds(int slotMinutes, int hour, int minute)
    {
        using var db = CreateDbContext();
        await SeedOffGridBookingAsync(db, slotMinutes);
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(NewPatientAt(new DateTime(2026, 1, 2, hour, minute, 0, DateTimeKind.Utc)));

        Assert.True(result.IsSuccess, result.Error);
    }

    private async Task SeedOffGridBookingAsync(ApplicationDbContext db, int slotMinutes)
    {
        await SeedStandardDataAsync(db);
        (await db.Calendars.FindAsync(1))!.SlotDurationMin = slotMinutes;
        db.Appointments.Add(new AppointmentEntity
        {
            Id = 4, Status = AppointmentStatus.Scheduled, DoctorId = 1, PatientId = 1, CreatedByTheFrontDeskId = 5,
            TimeOfAppointment = new DateTime(2026, 1, 2, 10, 5, 0, DateTimeKind.Utc), CreatedAt = Now.UtcDateTime
        });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task CreateAppointmentAsync_MissingAppointmentTime_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
        var dto = NewPatientAt(new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc));
        dto.AppointmentTime = null;

        var result = await service.CreateAppointmentAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Appointment time is required", result.Error);
    }

    [Fact]
    public async Task CreateAppointmentAsync_MissingDateOfBirth_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
        var dto = NewPatientAt(new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc));
        dto.DateOfBirth = null;

        var result = await service.CreateAppointmentAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Date of birth is required", result.Error);
    }

    [Theory]
    [InlineData(7, 45)]
    [InlineData(17, 50)]
    [InlineData(18, 0)]
    [InlineData(3, 0)]
    public async Task CreateAppointmentAsync_OutsideWorkingHours_Fails(int hour, int minute)
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(NewPatientAt(new DateTime(2026, 1, 2, hour, minute, 0, DateTimeKind.Utc)));

        Assert.False(result.IsSuccess);
        Assert.Equal("Appointment time is outside the doctor's working hours", result.Error);
    }

    [Theory]
    [InlineData(8, 0)]
    [InlineData(17, 45)]
    public async Task CreateAppointmentAsync_FirstAndLastSlot_Succeed(int hour, int minute)
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(NewPatientAt(new DateTime(2026, 1, 2, hour, minute, 0, DateTimeKind.Utc)));

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task CreateAppointmentAsync_DoctorWithoutSchedule_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        db.Calendars.RemoveRange(db.Calendars);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(NewPatientAt(new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc)));

        Assert.False(result.IsSuccess);
        Assert.Equal("Doctor has no schedule", result.Error);
    }

    [Fact]
    public async Task CreateAppointmentAsync_DoctorWithTwoSchedules_UsesTheFirst()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        db.Calendars.Add(new CalendarEntity
        {
            Id = 2,
            DoctorId = 1,
            StartTime = new DateTime(2000, 1, 1, 18, 0, 0, DateTimeKind.Utc),
            EndTime = new DateTime(2000, 1, 1, 22, 0, 0, DateTimeKind.Utc),
            SlotDurationMin = 60
        });
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(NewPatientAt(new DateTime(2026, 1, 2, 19, 0, 0, DateTimeKind.Utc)));

        Assert.False(result.IsSuccess);
        Assert.Equal("Appointment time is outside the doctor's working hours", result.Error);
    }

    [Fact]
    public async Task CreateAppointmentAsync_InactiveDepartment_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        (await db.Departments.FindAsync(1))!.IsActive = false;
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(NewPatientAt(new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc)));

        Assert.False(result.IsSuccess);
        Assert.Equal("Doctor's department is not active", result.Error);
    }

    [Fact]
    public async Task CreateAppointmentAsync_ScheduleEndingAtMidnight_AllowsLastSlot()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var calendar = (await db.Calendars.FindAsync(1))!;
        calendar.StartTime = new DateTime(2000, 1, 1, 20, 0, 0, DateTimeKind.Utc);
        calendar.EndTime = new DateTime(2000, 1, 2, 0, 0, 0, DateTimeKind.Utc);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(NewPatientAt(new DateTime(2026, 1, 2, 23, 45, 0, DateTimeKind.Utc)));

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task CreateAppointmentAsync_TimeWithOffset_ChecksWallClockAndStoresUtc()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
        var dto = NewPatientAt(new DateTime(2026, 1, 2, 12, 0, 0, DateTimeKind.Utc));
        dto.AppointmentTime = new DateTimeOffset(2026, 1, 2, 12, 0, 0, TimeSpan.FromHours(3));

        var result = await service.CreateAppointmentAsync(dto);

        Assert.True(result.IsSuccess);
        var stored = await db.Appointments.SingleAsync(a => a.PatientId != 1 && a.PatientId != 2 && a.PatientId != 3);
        Assert.Equal(new DateTime(2026, 1, 2, 9, 0, 0, DateTimeKind.Utc), stored.TimeOfAppointment);
        Assert.Equal(DateTimeKind.Utc, stored.TimeOfAppointment.Kind);
    }

    [Theory]
    [InlineData(20, 3)]
    [InlineData(17, 0)]
    [InlineData(12, -5)]
    public async Task CreateAppointmentAsync_HoursAreTheClinicsWhateverTheOffset(int hour, int offsetHours)
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db, clinicTimeZone: "Europe/Istanbul");
        var dto = NewPatientAt(new DateTime(2026, 1, 2, 12, 0, 0, DateTimeKind.Utc));
        dto.AppointmentTime = new DateTimeOffset(2026, 1, 2, hour, 0, 0, TimeSpan.FromHours(offsetHours));

        var result = await service.CreateAppointmentAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Appointment time is outside the doctor's working hours", result.Error);
    }

    [Fact]
    public async Task CreateAppointmentAsync_DayTheDoctorDoesNotWork_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(NewPatientAt(new DateTime(2026, 1, 3, 10, 0, 0, DateTimeKind.Utc)));

        Assert.False(result.IsSuccess);
        Assert.Equal("The doctor does not work on Saturdays", result.Error);
    }

    [Fact]
    public async Task CreateAppointmentAsync_WeekendDayTheDoctorWorks_Succeeds()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        (await db.Calendars.FindAsync(1))!.WorkingDays = [DayOfWeek.Saturday];
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(NewPatientAt(new DateTime(2026, 1, 3, 10, 0, 0, DateTimeKind.Utc)));

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task CreateAppointmentAsync_WorkingDayIsTheClinicsDay()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var calendar = (await db.Calendars.FindAsync(1))!;
        calendar.StartTime = new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        calendar.EndTime = new DateTime(2000, 1, 2, 0, 0, 0, DateTimeKind.Utc);
        await db.SaveChangesAsync();
        var service = CreateService(db, clinicTimeZone: "Europe/Istanbul");
        var dto = NewPatientAt(new DateTime(2026, 1, 2, 22, 0, 0, DateTimeKind.Utc));

        var result = await service.CreateAppointmentAsync(dto);

        Assert.Equal("The doctor does not work on Saturdays", result.Error);
    }

    [Theory]
    [InlineData(-60)]
    [InlineData(0)]
    public async Task CreateAppointmentAsync_TimeNotInTheFuture_Fails(int minutesFromNow)
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "New Patient",
            PhoneNumber = "555-0100",
            DateOfBirth = new DateOnly(1990, 1, 1),
            AppointmentTime = Now.AddMinutes(minutesFromNow)
        });

        Assert.Equal(FailureKind.Invalid, result.Failure);
        Assert.Equal("Appointments cannot be booked in the past", result.Error);
        Assert.Equal(3, await db.Appointments.CountAsync());
    }

    [Fact]
    public async Task CreateAppointmentAsync_TheNextSlot_Succeeds()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "New Patient",
            PhoneNumber = "555-0100",
            DateOfBirth = new DateOnly(1990, 1, 1),
            AppointmentTime = Now.AddMinutes(15)
        });

        Assert.True(result.IsSuccess, result.Error);
    }

    [Theory]
    [InlineData(11, 45, null)]
    [InlineData(12, 0, "Appointment time falls in the doctor's break, 12:00-13:00")]
    [InlineData(12, 45, "Appointment time falls in the doctor's break, 12:00-13:00")]
    [InlineData(13, 0, null)]
    public async Task CreateAppointmentAsync_AroundTheBreak(int hour, int minute, string? expectedError)
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var calendar = (await db.Calendars.FindAsync(1))!;
        calendar.BreakStartMinute = 12 * 60;
        calendar.BreakEndMinute = 13 * 60;
        await db.SaveChangesAsync();

        var result = await CreateService(db).CreateAppointmentAsync(NewPatientAt(new DateTime(2026, 1, 2, hour, minute, 0, DateTimeKind.Utc)));

        Assert.Equal(expectedError, result.Error);
    }

    [Fact]
    public async Task CreateAppointmentAsync_OnADayOff_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        db.TimeOff.Add(new TimeOffEntity { CalendarId = 1, FirstDay = new DateOnly(2026, 1, 2), LastDay = new DateOnly(2026, 1, 2), Reason = "Holiday" });
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var dayOff = await service.CreateAppointmentAsync(NewPatientAt(new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc)));
        var dayAfter = await service.CreateAppointmentAsync(NewPatientAt(new DateTime(2026, 1, 5, 10, 0, 0, DateTimeKind.Utc)));

        Assert.Equal("The doctor is away on 2026-01-02", dayOff.Error);
        Assert.True(dayAfter.IsSuccess, dayAfter.Error);
    }
}
