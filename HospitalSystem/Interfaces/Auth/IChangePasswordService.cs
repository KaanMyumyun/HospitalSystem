namespace HospitalSystem.Interfaces.Auth;

public interface IChangePasswordService
{
    Task<ChangePasswordResultDto> ChangeOwnPasswordAsync(ChangePasswordDto dto);
}
