using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interface;
using HospitalSystem.Interfaces.Appointments;

namespace HospitalSystem.Services.Appointments;
 
public class AppointmentQueryService : IAppointmentQueryService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
 
    public AppointmentQueryService(ApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }
 
    public async Task<ServiceResult<List<ViewAppointmentDto>>> GetAppointmentsAsync()
    {
        if (!_currentUser.IsInRole(UserRole.FrontDesk) && !_currentUser.IsInRole(UserRole.DemoFrontDesk))
            return ServiceResult<List<ViewAppointmentDto>>.Fail("Not allowed to list appointments");
 
        var appointments = await _context.Appointments
            .AsNoTracking()
            .Select(a => new ViewAppointmentDto
            {
                AppointmentId = a.Id,
                DoctorId = a.DoctorId,
                DoctorName = a.Doctor != null && a.Doctor.User != null ? a.Doctor.User.Name : null,
                PatientId = a.PatientId,
                PatientName = a.Patient != null ? a.Patient.Name : null,
                AppointmentTime = a.TimeOfAppointment,
                Status = a.Status
            })
            .ToListAsync();
 
        return ServiceResult<List<ViewAppointmentDto>>.Success(appointments);
    }
}
