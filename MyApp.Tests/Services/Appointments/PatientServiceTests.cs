using HospitalSystem.Services.Appointments;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Tests;

public class PatientServiceTests : AppointmentTestBase
{
    [Fact]
    public async Task CreatePatientAsync_SavesThePatientAndReturnsTheirId()
    {
        using var db = CreateDbContext();

        var id = await new PatientService(db).CreatePatientAsync("Maria Ivanova", "0888111222", new DateOnly(1990, 5, 17));

        var patient = await db.Patients.SingleAsync();
        Assert.Equal(patient.Id, id);
        Assert.Equal("Maria Ivanova", patient.Name);
        Assert.Equal("0888111222", patient.PhoneNumber);
        Assert.Equal(new DateOnly(1990, 5, 17), patient.DateOfBirth);
    }
}
