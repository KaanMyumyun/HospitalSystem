using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Appointments;

namespace HospitalSystem.Services.Appointments;

public class PatientService : IPatientService
{
    private readonly ApplicationDbContext _context;

    public PatientService(ApplicationDbContext context)
    {
        _context = context;
    }

    // Booking looks the phone number up in its own query and calls this only
    // when no patient has it.
    public async Task<int> CreatePatientAsync(string name, string phoneNumber, DateOnly dateOfBirth)
    {
        var patient = new PatientEntity
        {
            Name = name,
            PhoneNumber = phoneNumber,
            DateOfBirth = dateOfBirth
        };

        _context.Patients.Add(patient);
        await _context.SaveChangesAsync();

        return patient.Id;
    }
}
