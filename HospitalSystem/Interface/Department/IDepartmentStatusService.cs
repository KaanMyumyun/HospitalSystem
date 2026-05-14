namespace HospitalSystem.Interface.Department;
 
public interface IDepartmentStatusService
{
    Task<DepartmentActionResultDto> ChangeDepartmentStatusAsync(ChangeDepartmentStatusDto dto);
}
