namespace HospitalSystem.Interfaces.User;
 
public interface IChangeRoleService
{
    Task<ChangeRoleResultDto> ChangeRoleAsync(ChangeRoleDto dto);
}
