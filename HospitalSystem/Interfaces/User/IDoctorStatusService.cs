namespace HospitalSystem.Interfaces.User;
 
public interface IDoctorStatusService
{
    Task<ChangeDoctorsStatusResult> ChangeDoctorsStatusAsync(ChangeDoctorsStatus dto);
}
