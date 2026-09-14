namespace HospitalSystem.Interfaces.User;
 
public interface IResetPasswordService
{
    Task<ResetPasswordResultDto> ResetPasswordAsync(ResetPasswordDto dto);
}
