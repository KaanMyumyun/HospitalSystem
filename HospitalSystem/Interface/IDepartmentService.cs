public interface IDepartmentService
{
    Task<DepartmentActionResultDto>CreateDepartmentAsync(CreateDepartmentDto dto);
Task<DepartmentActionResultDto> ChangeDepartmentStatusAsync(ChangeDepartmentStatusDto dto);
Task<DepartmentActionResultDto> ChangeDoctorDepartmentAsync(ChangeDoctorDepartmentDto dto);
Task<List<ViewDepartmentDto>>ListDepartmentsAsync();
}