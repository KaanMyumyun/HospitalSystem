namespace HospitalSystem.Interface.Auth;
 
public interface IUserCreationService
{
    Task<CreateUserResultDto> CreateUserAsync(CreateUserDto dto);
}
