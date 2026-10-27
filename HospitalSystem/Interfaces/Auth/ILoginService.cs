namespace HospitalSystem.Interfaces.Auth;

public interface ILoginService
{
    Task<LoginResultDto> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default);
    Task<LoginResultDto> DemoLoginAsync(UserRole role, CancellationToken cancellationToken = default);
}
