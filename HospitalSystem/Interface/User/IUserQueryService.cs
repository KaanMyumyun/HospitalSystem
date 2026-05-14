namespace HospitalSystem.Interface.User;
 
public interface IUserQueryService
{
    Task<ServiceResult<List<UserDisplayDto>>> ListUsersAsync();
    Task<ServiceResult<List<DoctorDisplayDto>>> ListDoctorsAsync();
}
