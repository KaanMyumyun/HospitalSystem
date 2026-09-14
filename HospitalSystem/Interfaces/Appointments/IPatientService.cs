namespace HospitalSystem.Interfaces.Appointments;
 
public interface IPatientService
{
    Task<int> GetOrCreatePatientAsync(string name, string phoneNumber, DateTime dateOfBirth);
}
