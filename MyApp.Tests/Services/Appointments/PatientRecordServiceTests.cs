using HospitalSystem.Interfaces;
using HospitalSystem.Services;
using HospitalSystem.Services.Appointments;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace HospitalSystem.Tests;

// Seeded patients: Patient One (5550001), Patient Two (5550002) and Patient
// Three (5550003); appointments 1-3 belong to patients 1-3.
public class PatientRecordServiceTests : AppointmentTestBase
{
    private PatientRecordService CreateService(ApplicationDbContext db, bool isFrontDesk = true, bool isDemoFrontDesk = false)
    {
        var desk = CreateCurrentUser(isFrontDesk, isDemoFrontDesk);
        return new(db, desk, new AuditLogService(db, desk), TestClinic.Utc());
    }

    private static UpdatePatientDto Update(int patientId = 1, string name = "Patient One", string phone = "5550001", DateOnly? dateOfBirth = null) =>
        new() { PatientId = patientId, Name = name, PhoneNumber = phone, DateOfBirth = dateOfBirth ?? new DateOnly(1990, 1, 1) };

    [Theory]
    [InlineData("patient t", new[] { "Patient Three", "Patient Two" })]
    [InlineData("555-0002", new[] { "Patient Two" })]
    [InlineData("ONE", new[] { "Patient One" })]
    public async Task List_FindsPatientsByNameOrPhoneDigits(string search, string[] expected)
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db).ListPatientsAsync(new PatientQueryDto { Search = search });

        Assert.NotNull(result.Data);
        Assert.Equal(expected, result.Data.Items.Select(p => p.Name));
        Assert.Equal(expected.Length, result.Data.TotalCount);
    }

    [Fact]
    public async Task List_PagesWithTheTotalOfAllMatches()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db).ListPatientsAsync(new PatientQueryDto { Page = 2, PageSize = 2 });

        Assert.NotNull(result.Data);
        Assert.Equal(["Patient Two"], result.Data.Items.Select(p => p.Name));
        Assert.Equal(3, result.Data.TotalCount);
    }

    [Fact]
    public async Task List_IsOpenToDemoReception()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db, isFrontDesk: false, isDemoFrontDesk: true).ListPatientsAsync(new PatientQueryDto());

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task Get_ReturnsThePatientWithTheirAppointments()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db).GetPatientAsync(3);

        Assert.NotNull(result.Data);
        Assert.Equal("Patient Three", result.Data.Name);
        var appointment = Assert.Single(result.Data.Appointments);
        Assert.Equal(AppointmentStatus.Cancelled, appointment.Status);
        Assert.Equal("Dr. Test", appointment.DoctorName);
    }

    [Fact]
    public async Task Get_UnknownPatient_IsNotFound()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db).GetPatientAsync(999);

        Assert.Equal(FailureKind.NotFound, result.Failure);
    }

    [Fact]
    public async Task Update_StoresTrimmedNameAndDigitsOnlyPhone_AndAuditsTheChange()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db).UpdatePatientAsync(Update(name: "  Patient Uno ", phone: "+359 (888) 111-222"));

        Assert.True(result.IsSuccess);
        var patient = await db.Patients.SingleAsync(p => p.Id == 1);
        Assert.Equal("Patient Uno", patient.Name);
        Assert.Equal("+359888111222", patient.PhoneNumber);
        Assert.Equal(new DateOnly(1990, 1, 1), patient.DateOfBirth);
        var entry = Assert.Single(db.AuditLogs, a => a.Action == "UpdatePatient");
        Assert.Contains("phone number from 5550001 to +359888111222", entry.Details);
    }

    [Theory]
    [InlineData("", "5550001", "Patient name is required")]
    [InlineData("Patient One", "555-CALL", "Phone number must contain 7 to 15 digits and no letters")]
    public async Task Update_InvalidDetails_AreRefused(string name, string phone, string error)
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db).UpdatePatientAsync(Update(name: name, phone: phone));

        Assert.Equal(error, result.Error);
    }

    [Fact]
    public async Task Update_BirthDateInTheFuture_IsRefused()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db).UpdatePatientAsync(Update(dateOfBirth: DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2))));

        Assert.Equal("Date of birth cannot be in the future", result.Error);
    }

    [Fact]
    public async Task Update_WithNoChange_IsRefused()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var dateOfBirth = (await db.Patients.SingleAsync(p => p.Id == 1)).DateOfBirth;

        var result = await CreateService(db).UpdatePatientAsync(Update(dateOfBirth: dateOfBirth));

        Assert.Equal("Nothing to change", result.Error);
    }

    [Fact]
    public async Task Update_IsNotOpenToDemoReception()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);

        var result = await CreateService(db, isFrontDesk: false, isDemoFrontDesk: true).UpdatePatientAsync(Update(name: "Changed"));

        Assert.Equal(FailureKind.Forbidden, result.Failure);
    }
}
