public interface IAuthService
{
    Task<LoginResultDto> LoginAsync(LoginDto dto);
    Task<CreateUserResultDto>CreateUser(CreateUserDto dto);
}