namespace HospitalSystem.Interface.Department;
 
public interface IDepartmentCreationService
{
    Task<DepartmentActionResultDto> CreateDepartmentAsync(CreateDepartmentDto dto);
}
