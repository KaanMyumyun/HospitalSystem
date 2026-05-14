using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interface;
using HospitalSystem.Interfaces.Appointments;

namespace HospitalSystem.Services.Appointments;
 
public class AppointmentCreationService : IAppointmentCreationService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IPatientService _patientService;
 
    private static readonly TimeSpan AppointmentDuration = TimeSpan.FromMinutes(15);
 
    public AppointmentCreationService(
        ApplicationDbContext context,
        ICurrentUserService currentUser,
        IPatientService patientService)
    {
        _context = context;
        _currentUser = currentUser;
        _patientService = patientService;
    }
 
    public async Task<CreateAppointmentResultDto> CreateAppointmentAsync(CreateAppointmentDto dto, int frontDeskUserId)
    {
        if (!_currentUser.IsInRole(UserRole.FrontDesk))
            return CreateAppointmentResultDto.Fail("You are not allowed to create appointments");
 
        var doctorExists = await _context.Doctors.AnyAsync(d => d.Id == dto.DoctorId);
        if (!doctorExists)
            return CreateAppointmentResultDto.Fail("Doctor not found");
 
        var appointmentTime = DateTime.SpecifyKind(dto.AppointmentTime, DateTimeKind.Utc);
 
        if (await HasOverlapAsync(dto.DoctorId, appointmentTime))
            return CreateAppointmentResultDto.Fail("Doctor already booked for that time slot");
 
        var patientId = await _patientService.GetOrCreatePatientAsync(
            dto.PatientName, dto.PhoneNumber, dto.DateOfBirth);
 
        var appointment = new AppointmentsEntity
        {
            DoctorId = dto.DoctorId,
            PatientId = patientId,
            TimeOfAppointment = appointmentTime,
            CreatedAt = DateTime.UtcNow,
            CreatedByTheFrontDeskId = frontDeskUserId,
            Status = AppointmentStatus.Scheduled
        };
 
        _context.Appointments.Add(appointment);
        await _context.SaveChangesAsync();
 
        return CreateAppointmentResultDto.Success();
    }
 
    private async Task<bool> HasOverlapAsync(int doctorId, DateTime appointmentTime)
    {
        var appointmentEnd = appointmentTime.Add(AppointmentDuration);
 
        var existingAppointments = await _context.Appointments
            .Where(a =>
                a.DoctorId == doctorId &&
                a.Status == AppointmentStatus.Scheduled &&
                a.TimeOfAppointment.Date == appointmentTime.Date)
            .Select(a => new { a.TimeOfAppointment })
            .ToListAsync();
 
        return existingAppointments.Any(a =>
        {
            var existingEnd = a.TimeOfAppointment.Add(AppointmentDuration);
            return appointmentTime < existingEnd && appointmentEnd > a.TimeOfAppointment;
        });
    }
}
