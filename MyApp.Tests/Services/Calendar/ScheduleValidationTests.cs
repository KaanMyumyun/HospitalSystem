using HospitalSystem.Services.Calendar;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Tests;

public class ScheduleValidationTests
{
    private static readonly ScheduleValidation.DoctorState Bookable = new(IsActive: true, DepartmentIsActive: true);

    private static ApplicationDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Fact]
    public void Validate_AWholeNumberOfSlotsWithinTheDay_IsAccepted()
    {
        Assert.Null(ScheduleValidation.Validate(Bookable, 0, 24, 30, [DayOfWeek.Monday]));
    }

    [Theory]
    [InlineData(-1, 17, 15, "Start hour must be between 0 and 23")]
    [InlineData(24, 24, 15, "Start hour must be between 0 and 23")]
    [InlineData(8, 0, 15, "End hour must be between 1 and 24")]
    [InlineData(8, 25, 15, "End hour must be between 1 and 24")]
    [InlineData(17, 8, 15, "Start hour must be before end hour")]
    [InlineData(8, 8, 15, "Start hour must be before end hour")]
    [InlineData(8, 17, 4, "Slot duration must be between 5 and 120 minutes")]
    [InlineData(8, 17, 121, "Slot duration must be between 5 and 120 minutes")]
    [InlineData(8, 17, 40, "Slot duration must fit evenly inside the schedule window")]
    public void Validate_BadHours_AreRefused(int startHour, int endHour, int slotDurationMin, string error)
    {
        var result = ScheduleValidation.Validate(Bookable, startHour, endHour, slotDurationMin, null);

        Assert.NotNull(result);
        Assert.Equal(FailureKind.Invalid, result.Failure);
        Assert.Equal(error, result.Error);
    }

    [Fact]
    public void Validate_NoWorkingDays_IsRefused()
    {
        Assert.Equal("Choose at least one working day", ScheduleValidation.Validate(Bookable, 8, 16, 30, [])?.Error);
        Assert.Equal("Working days must be days of the week", ScheduleValidation.Validate(Bookable, 8, 16, 30, [(DayOfWeek)7])?.Error);
    }

    [Theory]
    [InlineData(false, true, "Cannot schedule an inactive doctor")]
    [InlineData(true, false, "Cannot schedule a doctor in an inactive department")]
    public void Validate_ADoctorWhoCannotBeBooked_IsRefused(bool isActive, bool departmentIsActive, string error)
    {
        var result = ScheduleValidation.Validate(new(isActive, departmentIsActive), 8, 16, 30, null);

        Assert.Equal(error, result?.Error);
    }

    [Fact]
    public async Task ValidateAsync_ChecksTheDoctorInTheDatabase()
    {
        using var db = CreateDbContext();
        var department = new DepartmentEntity { Id = 1, Department = "Cardiology", IsActive = true };
        var user = new UserEntity { Id = 1, Name = "Dr Test", PasswordHash = "x", Role = UserRole.Doctor };
        db.Doctors.Add(new DoctorEntity { Id = 1, User = user, Department = department, IsActive = true });
        db.Doctors.Add(new DoctorEntity { Id = 2, User = new UserEntity { Id = 2, Name = "Dr Two", PasswordHash = "x", Role = UserRole.Doctor }, Department = department, IsActive = true });
        db.Calendars.Add(new CalendarEntity { DoctorId = 2, StartTime = DateTime.UtcNow, EndTime = DateTime.UtcNow, SlotDurationMin = 30 });
        await db.SaveChangesAsync();

        Assert.Null(await ScheduleValidation.ValidateAsync(db, 1, 8, 16, 30, null));
        Assert.Equal("Doctor is required", (await ScheduleValidation.ValidateAsync(db, 0, 8, 16, 30, null))?.Error);
        Assert.Equal(FailureKind.NotFound, (await ScheduleValidation.ValidateAsync(db, 99, 8, 16, 30, null))?.Failure);
        Assert.Equal(FailureKind.Conflict, (await ScheduleValidation.ValidateAsync(db, 2, 8, 16, 30, null))?.Failure);
    }
}
