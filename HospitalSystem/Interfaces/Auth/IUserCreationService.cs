namespace HospitalSystem.Interfaces.Auth;
 
public interface IUserCreationService
{
    Task<CreateUserResultDto> CreateUserAsync(CreateUserDto dto);
}
