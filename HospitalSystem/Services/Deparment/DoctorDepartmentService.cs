using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Department;
 
namespace HospitalSystem.Services.Deparment;
 
public class DoctorDepartmentService : IDoctorDepartmentService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;
 
    public DoctorDepartmentService(ApplicationDbContext context, ICurrentUserService currentUser, IAuditLogService auditLog)
    {
        _context = context;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }
 
    public async Task<DepartmentActionResultDto> ChangeDoctorDepartmentAsync(ChangeDoctorDepartmentDto dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return DepartmentActionResultDto.Fail("You are not allowed to change doctor department");
 
        // The department's state comes with the doctor: one query instead of two.
        var found = await _context.Doctors
            .Where(d => d.Id == dto.DoctorId)
            .Select(d => new
            {
                Doctor = d,
                DepartmentIsActive = _context.Departments
                    .Where(x => x.Id == dto.DepartmentId)
                    .Select(x => (bool?)x.IsActive)
                    .FirstOrDefault()
            })
            .FirstOrDefaultAsync();
        if (found == null)
            return DepartmentActionResultDto.Fail("Doctor doesnt exist ");
 
        var doctor = found.Doctor;
        if (!doctor.IsActive)
            return DepartmentActionResultDto.Fail("This Doctor isnt active");
 
        if (found.DepartmentIsActive is not bool departmentIsActive)
            return DepartmentActionResultDto.Fail("Department doesnt exist");
 
        if (!departmentIsActive)
            return DepartmentActionResultDto.Fail("This Deparment isnt active");
 
        if (doctor.DepartmentId == dto.DepartmentId)
            return DepartmentActionResultDto.Fail("Already in that department");
 
        var oldDepartmentId = doctor.DepartmentId;
        doctor.DepartmentId = dto.DepartmentId;
        await _auditLog.LogAsync(
            "ChangeDoctorDepartment",
            "Doctor",
            doctor.Id,
            $"Doctor {doctor.Id} moved from department {oldDepartmentId} to {dto.DepartmentId}");
        await _context.SaveChangesAsync();
 
        return DepartmentActionResultDto.Success();
    }
}
