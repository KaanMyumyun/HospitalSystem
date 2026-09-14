namespace HospitalSystem.Interfaces.User;
 
public interface ICreateDoctorService
{
    Task<CreateDoctorResultDto> CreateDoctorAsync(CreateDoctorDto dto);
}
