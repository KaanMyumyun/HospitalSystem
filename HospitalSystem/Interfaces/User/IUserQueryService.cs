namespace HospitalSystem.Interfaces.User;

public interface IUserQueryService
{
    Task<ServiceResult<PagedResult<UserDisplayDto>>> ListUsersAsync(
        UserQueryDto query, CancellationToken cancellationToken = default);
    Task<ServiceResult<List<DoctorDisplayDto>>> ListDoctorsAsync(CancellationToken cancellationToken = default);
}
