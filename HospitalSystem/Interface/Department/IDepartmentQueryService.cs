namespace HospitalSystem.Interface.Department;
 
public interface IDepartmentQueryService
{
    Task<ServiceResult<List<ViewDepartmentDto>>> ListDepartmentsAsync();
}
