namespace HospitalSystem.Interfaces.Appointments;
 
public interface IPatientService
{
    Task<int> CreatePatientAsync(string name, string phoneNumber, DateOnly dateOfBirth);
}
