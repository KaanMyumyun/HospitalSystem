using HospitalSystem.Services.Appointments;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
 
public class AppointmentCreationServiceTests : AppointmentTestBase
{
    private AppointmentCreationService CreateService(ApplicationDbContext db, bool isFrontDesk = true)
    {
        var patientService = new PatientService(db);
        return new AppointmentCreationService(db, CreateCurrentUser(isFrontDesk), patientService);
    }
 
    [Fact]
    public async Task CreateAppointmentAsync_NewPatient_Succeeds()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
 
        var time = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc);
        var dob = new DateTime(2000, 1, 2, 0, 0, 0, DateTimeKind.Utc);
 
        var dto = new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "New Patient",
            PhoneNumber = "123-4567",
            DateOfBirth = dob,
            AppointmentTime = time
        };
 
        var result = await service.CreateAppointmentAsync(dto, 5);
 
        Assert.True(result.IsSuccess);
 
        var patient = await db.Patients.FirstOrDefaultAsync(p => p.PhoneNumber == "123-4567");
        Assert.NotNull(patient);
        Assert.Equal("New Patient", patient!.Name);
        Assert.Equal(dob, patient.DateOfBirth);
 
        var appointment = await db.Appointments.FirstOrDefaultAsync(a => a.PatientId == patient.Id);
        Assert.NotNull(appointment);
        Assert.Equal(time, appointment!.TimeOfAppointment);
        Assert.Equal(AppointmentStatus.Scheduled, appointment.Status);
        Assert.Equal(5, appointment.CreatedByTheFrontDeskId);
        Assert.Null(appointment.CancelledAt);
        Assert.True(appointment.CreatedAt <= DateTime.UtcNow);
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
            PhoneNumber = "555-0001", // already seeded
            DateOfBirth = DateTime.UtcNow.AddYears(-30),
            AppointmentTime = time
        };
 
        var result = await service.CreateAppointmentAsync(dto, 5);
 
        Assert.True(result.IsSuccess);
 
        var patientCount = await db.Patients.CountAsync(p => p.PhoneNumber == "555-0001");
        Assert.Equal(1, patientCount); // no dups created
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
            DateOfBirth = DateTime.UtcNow,
            AppointmentTime = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc)
        };
 
        var result = await service.CreateAppointmentAsync(dto, 5);
 
        Assert.False(result.IsSuccess);
        Assert.Equal("You are not allowed to create appointments", result.Error);
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
            DateOfBirth = DateTime.UtcNow,
            AppointmentTime = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc)
        };
 
        var result = await service.CreateAppointmentAsync(dto, 5);
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Doctor not found", result.Error);
    }
 
    [Fact]
    public async Task CreateAppointmentAsync_OverlappingTime_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db);
 
        // Seeded appointment is at 10:00; 10:05 overlaps within the 15-min window
        var dto = new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "New Patient",
            PhoneNumber = "123-4567",
            DateOfBirth = DateTime.UtcNow.AddYears(-20),
            AppointmentTime = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc)
        };
 
        var result = await service.CreateAppointmentAsync(dto, 5);
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Doctor already booked for that time slot", result.Error);
    }
}
