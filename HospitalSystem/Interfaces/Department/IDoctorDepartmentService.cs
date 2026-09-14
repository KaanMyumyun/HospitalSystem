namespace HospitalSystem.Interfaces.Department;
 
public interface IDoctorDepartmentService
{
    Task<DepartmentActionResultDto> ChangeDoctorDepartmentAsync(ChangeDoctorDepartmentDto dto);
}
    