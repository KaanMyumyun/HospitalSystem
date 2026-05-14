namespace HospitalSystem.Interface.Auth;
 
public interface ILoginService
{
    Task<LoginResultDto> LoginAsync(LoginDto dto);
}
