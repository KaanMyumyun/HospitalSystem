using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interface;
using HospitalSystem.Interface.User;
 
namespace HospitalSystem.Services;
 
public class DoctorStatusService : IDoctorStatusService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
 
    public DoctorStatusService(ApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }
 
    public async Task<ChangeDoctorsStatusResult> ChangeDoctorsStatusAsync(ChangeDoctorsStatus dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return ChangeDoctorsStatusResult.Fail("You are not allowed to change doctor status");
 
        var doctor = await _context.Doctors
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == dto.DoctorId);
 
        if (doctor == null)
            return ChangeDoctorsStatusResult.Fail("Doctor doesnt exist");
 
        if (doctor.IsActive == dto.IsActive)
            return ChangeDoctorsStatusResult.Fail("Doctor already has this status");
 
        doctor.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
 
        return ChangeDoctorsStatusResult.Success(new ChangeDoctorsStatus
        {
            DoctorId = doctor.Id,
            UserId = doctor.UserId,
            UserName = doctor.User.Name,
            IsActive = doctor.IsActive
        });
    }
}
