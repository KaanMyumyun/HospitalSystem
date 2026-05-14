using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interface;
using HospitalSystem.Interfaces.Appointments;

namespace HospitalSystem.Services.Appointments;
 
public class PatientService : IPatientService
{
    private readonly ApplicationDbContext _context;
 
    public PatientService(ApplicationDbContext context)
    {
        _context = context;
    }
 
    public async Task<int> GetOrCreatePatientAsync(string name, string phoneNumber, DateTime dateOfBirth)
    {
        var existing = await _context.Patients
            .FirstOrDefaultAsync(p => p.PhoneNumber == phoneNumber);
 
        if (existing != null)
            return existing.Id;
 
        var patient = new PatientEntity
        {
            Name = name,
            PhoneNumber = phoneNumber,
            DateOfBirth = DateTime.SpecifyKind(dateOfBirth, DateTimeKind.Utc)
        };
 
        _context.Patients.Add(patient);
        await _context.SaveChangesAsync();
 
        return patient.Id;
    }
}
