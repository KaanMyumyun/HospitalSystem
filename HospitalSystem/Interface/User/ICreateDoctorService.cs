namespace HospitalSystem.Interface.User;
 
public interface ICreateDoctorService
{
    Task<CreateDoctorResultDto> CreateDoctorAsync(CreateDoctorDto dto);
}
