public interface IUserService
{
    Task<ResetPasswordResultDto> ResetPasswordAsync(ResetPasswordDto dto);
    Task<ChangeRoleResultDto> ChangeRoleAsync(ChangeRoleDto dto);
    Task<List<UserDisplayDto>>ListUsersAsync();
    Task<List<DoctorDisplayDto>>ListDoctorsAsync();
    Task<CreateDoctorResultDto>CreateDoctorAsync(CreateDoctorDto dto);
}