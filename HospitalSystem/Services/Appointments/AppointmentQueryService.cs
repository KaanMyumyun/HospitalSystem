using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Appointments;

namespace HospitalSystem.Services.Appointments;
 
public class AppointmentQueryService : IAppointmentQueryService
{
    // Six weeks covers a month view and keeps one response small.
    private static readonly TimeSpan MaxWindow = TimeSpan.FromDays(42);

    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public AppointmentQueryService(ApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<ServiceResult<List<ViewAppointmentDto>>> GetAppointmentsAsync(AppointmentQueryDto query)
    {
        if (!_currentUser.IsInRole(UserRole.FrontDesk) && !_currentUser.IsInRole(UserRole.DemoFrontDesk))
            return ServiceResult<List<ViewAppointmentDto>>.Fail("Not allowed to list appointments");

        if (query.DoctorId is not int doctorId || query.From is not DateTimeOffset from || query.To is not DateTimeOffset to)
            return ServiceResult<List<ViewAppointmentDto>>.Fail("Doctor id, from and to are required");

        if (to <= from)
            return ServiceResult<List<ViewAppointmentDto>>.Fail("To must be after from");

        if (to - from > MaxWindow)
            return ServiceResult<List<ViewAppointmentDto>>.Fail("The time window can be at most 42 days");

        var fromUtc = from.UtcDateTime;
        var toUtc = to.UtcDateTime;

        var appointments = await _context.Appointments
            .AsNoTracking()
            .Where(a => a.DoctorId == doctorId && a.TimeOfAppointment >= fromUtc && a.TimeOfAppointment < toUtc)
            .OrderBy(a => a.TimeOfAppointment)
            .ThenBy(a => a.Id)
            .Select(a => new ViewAppointmentDto
            {
                AppointmentId = a.Id,
                DoctorId = a.DoctorId,
                DoctorName = a.Doctor != null && a.Doctor.User != null ? a.Doctor.User.Name : null,
                PatientId = a.PatientId,
                PatientName = a.Patient != null ? a.Patient.Name : null,
                PatientPhoneNumber = a.Patient != null ? a.Patient.PhoneNumber : null,
                AppointmentTime = a.TimeOfAppointment,
                Status = a.Status
            })
            .ToListAsync();
 
        return ServiceResult<List<ViewAppointmentDto>>.Success(appointments);
    }
}
