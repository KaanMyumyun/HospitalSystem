using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Appointments;

namespace HospitalSystem.Services.Appointments;

public class PatientService(ApplicationDbContext context) : IPatientService
{
    public async Task<int> CreatePatientAsync(
        string name, string phoneNumber, DateOnly dateOfBirth, CancellationToken cancellationToken = default)
    {
        var patient = new PatientEntity
        {
            Name = name,
            PhoneNumber = phoneNumber,
            DateOfBirth = dateOfBirth
        };

        context.Patients.Add(patient);
        await context.SaveChangesAsync(cancellationToken);

        return patient.Id;
    }
}
