namespace HospitalSystem.Interfaces.Department;
 
public interface IDepartmentQueryService
{
    Task<ServiceResult<List<ViewDepartmentDto>>> ListDepartmentsAsync();
}
