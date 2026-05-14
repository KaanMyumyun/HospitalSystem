namespace HospitalSystem.Interface.Department;
 
public interface IDoctorDepartmentService
{
    Task<DepartmentActionResultDto> ChangeDoctorDepartmentAsync(ChangeDoctorDepartmentDto dto);
}
    