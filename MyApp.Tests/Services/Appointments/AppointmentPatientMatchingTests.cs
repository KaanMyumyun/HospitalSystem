using HospitalSystem.Services;
using HospitalSystem.Services.Appointments;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Tests;

public class AppointmentPatientMatchingTests : AppointmentTestBase
{
    private static readonly DateOnly PatientOneBirthDate = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-30));

    private AppointmentCreationService CreateService(ApplicationDbContext db)
    {
        var desk = CreateCurrentUser();
        return new(db, desk, new PatientService(db), new AuditLogService(db, desk), CreateClock(), TestClinic.Utc());
    }

    private static CreateAppointmentDto Booking(string name, string phoneNumber, DateOnly dateOfBirth) => new()
    {
        DoctorId = 1,
        PatientName = name,
        PhoneNumber = phoneNumber,
        DateOfBirth = dateOfBirth,
        AppointmentTime = new DateTime(2026, 1, 2, 9, 0, 0, DateTimeKind.Utc)
    };

    [Fact]
    public async Task SamePhoneNameAndBirthDate_IgnoringFormattingAndCase_BooksExistingPatient()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(Booking("  PATIENT one ", "(555) 0001", PatientOneBirthDate));

        Assert.True(result.IsSuccess);
        Assert.Equal(3, await db.Patients.CountAsync());
        Assert.Equal(1, (await db.Appointments.SingleAsync(a => a.TimeOfAppointment == new DateTime(2026, 1, 2, 9, 0, 0, DateTimeKind.Utc))).PatientId);
    }

    [Fact]
    public async Task SamePhoneDifferentPerson_ListsPossibleMatchAndBooksNothing()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(Booking("Child One", "555-0001", new DateOnly(2015, 3, 4)));

        Assert.False(result.IsSuccess);
        Assert.True(result.IsConflict);
        var match = Assert.Single(result.PossibleMatches!);
        Assert.Equal(1, match.PatientId);
        Assert.Equal("Patient One", match.Name);
        Assert.Equal(PatientOneBirthDate, match.DateOfBirth);
        Assert.Equal("5550001", match.PhoneNumber);
        Assert.Equal(3, await db.Patients.CountAsync());
        Assert.Equal(3, await db.Appointments.CountAsync());
    }

    [Fact]
    public async Task ManyPatientsOnOnePhone_ListsTheFirstTenByName()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        for (var i = 11; i >= 0; i--)
            db.Patients.Add(new PatientEntity { Name = $"Relative {i:00}", PhoneNumber = "5559999", DateOfBirth = new DateOnly(1970, 1, 1) });
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(Booking("Someone New", "555-9999", new DateOnly(2001, 1, 1)));

        Assert.False(result.IsSuccess);
        Assert.Equal(
            Enumerable.Range(0, 10).Select(i => $"Relative {i:00}"),
            result.PossibleMatches!.Select(m => m.Name));
    }

    [Fact]
    public async Task SameNameAndBirthDateDifferentPhone_ListsPossibleMatch()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(Booking("patient one", "0888 123 456", PatientOneBirthDate));

        Assert.False(result.IsSuccess);
        Assert.Equal(1, Assert.Single(result.PossibleMatches!).PatientId);
    }

    [Fact]
    public async Task CreateNewPatient_RegistersPatientSharingThePhone()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
        var booking = Booking("Child One", "555-0001", new DateOnly(2015, 3, 4));
        booking.CreateNewPatient = true;

        var result = await service.CreateAppointmentAsync(booking);

        Assert.True(result.IsSuccess);
        var sharing = await db.Patients.Where(p => p.PhoneNumber == "5550001").OrderBy(p => p.Id).ToListAsync();
        Assert.Equal(new[] { "Patient One", "Child One" }, sharing.Select(p => p.Name));
        Assert.Equal(sharing[1].Id, (await db.Appointments.SingleAsync(a => a.TimeOfAppointment == new DateTime(2026, 1, 2, 9, 0, 0, DateTimeKind.Utc))).PatientId);
    }

    [Fact]
    public async Task CreateNewPatient_StillBooksAnExactMatch()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
        var booking = Booking("Patient One", "5550001", PatientOneBirthDate);
        booking.CreateNewPatient = true;

        var result = await service.CreateAppointmentAsync(booking);

        Assert.True(result.IsSuccess);
        Assert.Equal(3, await db.Patients.CountAsync());
    }

    [Fact]
    public async Task ChosenPatient_IsBookedWithoutAnyNewPatient()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
        var booking = Booking("Child One", "555-0001", new DateOnly(2015, 3, 4));
        booking.PatientId = 2;

        var result = await service.CreateAppointmentAsync(booking);

        Assert.True(result.IsSuccess);
        Assert.Equal(3, await db.Patients.CountAsync());
        Assert.Equal(2, (await db.Appointments.SingleAsync(a => a.TimeOfAppointment == new DateTime(2026, 1, 2, 9, 0, 0, DateTimeKind.Utc))).PatientId);
    }

    [Fact]
    public async Task ChosenPatientNotOnFile_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
        var booking = Booking("Someone", "0888 123 456", new DateOnly(1990, 1, 1));
        booking.PatientId = 999;

        var result = await service.CreateAppointmentAsync(booking);

        Assert.False(result.IsSuccess);
        Assert.Equal("Patient not found", result.Error);
        Assert.Equal(FailureKind.NotFound, result.Failure);
    }

    [Fact]
    public async Task ChosenPatientAndCreateNewPatient_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
        var booking = Booking("Child One", "555-0001", new DateOnly(2015, 3, 4));
        booking.PatientId = 1;
        booking.CreateNewPatient = true;

        var result = await service.CreateAppointmentAsync(booking);

        Assert.False(result.IsSuccess);
        Assert.Equal("Choose a patient on file or a new patient, not both", result.Error);
    }

    [Fact]
    public async Task NewPatient_IsStoredWithTrimmedNameAndDigitsOnlyPhone()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);

        var result = await service.CreateAppointmentAsync(Booking("  Maria Ivanova ", " +359 (888) 111-222 ", new DateOnly(1980, 2, 3)));

        Assert.True(result.IsSuccess);
        var patient = await db.Patients.SingleAsync(p => p.Id > 3);
        Assert.Equal("Maria Ivanova", patient.Name);
        Assert.Equal("+359888111222", patient.PhoneNumber);
    }
}
