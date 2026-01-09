public interface IAuthService
{
    Task<LoginResultDto> LoginAsync(LoginDto dto);
}