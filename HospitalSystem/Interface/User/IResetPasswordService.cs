namespace HospitalSystem.Interface.User;
 
public interface IResetPasswordService
{
    Task<ResetPasswordResultDto> ResetPasswordAsync(ResetPasswordDto dto);
}
