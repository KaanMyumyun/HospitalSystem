namespace HospitalSystem.Interface.User;
 
public interface IDoctorStatusService
{
    Task<ChangeDoctorsStatusResult> ChangeDoctorsStatusAsync(ChangeDoctorsStatus dto);
}
