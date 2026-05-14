namespace HospitalSystem.Interface.User;
 
public interface IChangeRoleService
{
    Task<ChangeRoleResultDto> ChangeRoleAsync(ChangeRoleDto dto);
}
