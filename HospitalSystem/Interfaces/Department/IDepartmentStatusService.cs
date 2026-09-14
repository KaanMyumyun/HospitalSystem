namespace HospitalSystem.Interfaces.Department;
 
public interface IDepartmentStatusService
{
    Task<DepartmentActionResultDto> ChangeDepartmentStatusAsync(ChangeDepartmentStatusDto dto);
}
