namespace HospitalSystem.Interfaces.Department;
 
public interface IDepartmentCreationService
{
    Task<DepartmentActionResultDto> CreateDepartmentAsync(CreateDepartmentDto dto);
}
