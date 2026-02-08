public interface IUserService
{
    Task<ResetPasswordResultDto> ResetPasswordAsync(ResetPasswordDto dto);
    Task<ChangeRoleResultDto> ChangeRoleAsync(ChangeRoleDto dto);
  Task<ServiceResult<List<UserDisplayDto>>> ListUsersAsync();
   Task<ServiceResult<List<DoctorDisplayDto>>> ListDoctorsAsync();
    Task<CreateDoctorResultDto>CreateDoctorAsync(CreateDoctorDto dto);
    Task<ChangeDoctorsStatusResult>ChangeDoctorsStatusAsync(ChangeDoctorsStatus dto);
}