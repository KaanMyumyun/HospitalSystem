namespace HospitalSystem.Interfaces.User;

public interface IUserQueryService
{
    Task<ServiceResult<PagedResult<UserDisplayDto>>> ListUsersAsync(UserQueryDto query);
    Task<ServiceResult<List<DoctorDisplayDto>>> ListDoctorsAsync();
}
