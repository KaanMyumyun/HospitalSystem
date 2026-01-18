using Microsoft.EntityFrameworkCore;

public class AppointmentService : IAppointmentService
{
    private readonly ApplicationDbContext _context;
    public AppointmentService(ApplicationDbContext context)
    {
        _context = context;
    }
    public async Task<CancelAppointmentResultDto> CancelAppointmentAsync(CancelAppointmentDto dto)
    {
        var appointment = await _context.Appointments.SingleOrDefaultAsync(a => a.Id == dto.AppointmentId);
        if (appointment == null)
        {
            return CancelAppointmentResultDto.Fail("Appointment not found");
        }

        if (appointment.Status == AppointmentStatus.Cancelled)
        {
            return CancelAppointmentResultDto.Fail("Appointment already canceled");
        }

        appointment.Status = AppointmentStatus.Cancelled;
        appointment.CancellationReason = dto.Reason;
        appointment.CancelledAt = DateTime.UtcNow;
       
        if (string.IsNullOrWhiteSpace(dto.Reason))
        {
            return CancelAppointmentResultDto.Fail("Cancellation reason is required");
        }

        await _context.SaveChangesAsync();
        return CancelAppointmentResultDto.Success();
    }

    public async Task<CreateAppointmentResultDto> CreateAppointmentAsync(CreateAppointmentDto dto, int frontDeskUserId)
    {
        var doctorExist = await _context.Doctors.AnyAsync(u => u.Id == dto.DoctorId);
        if (!doctorExist)
        {
            return CreateAppointmentResultDto.Fail("Doctor not found");
        }

        var patientExist = await _context.Patients.AnyAsync(u => u.Id == dto.PatientId);
        if (!patientExist)
        {
            return CreateAppointmentResultDto.Fail("Patient not found");
        }

        var duration = TimeSpan.FromMinutes(15);
        var appointmentEnd = dto.AppointmentTime.Add(duration);

        var overlap = await _context.Appointments.AnyAsync(a => a.DoctorId == dto.DoctorId &&
         a.Status == AppointmentStatus.Scheduled &&
        dto.AppointmentTime < a.TimeOfAppointment.Add(duration) &&
        appointmentEnd > a.TimeOfAppointment
        );

        if (overlap)
        {
            return CreateAppointmentResultDto.Fail("doctor already booked for that hour");
        }



        var Appointment = new AppointmentsEntity
        {
            DoctorId = dto.DoctorId,
            PatientId = dto.PatientId,
            TimeOfAppointment = dto.AppointmentTime,
            CreatedAt = DateTime.UtcNow,
            CreatedByTheFrontDeskId = frontDeskUserId,
            Status = AppointmentStatus.Scheduled
        };

        _context.Appointments.Add(Appointment);
        await _context.SaveChangesAsync();
        return CreateAppointmentResultDto.Success();
    }

    public async Task<List<ViewAppointmentDto>> GetAppointmentsAsync()
    {
        return await _context.Appointments
     .AsNoTracking()
     .Select(u => new ViewAppointmentDto
     {
         AppointmentId = u.Id,
         DoctorId = u.DoctorId,
         DoctorName = u.Doctor != null && u.Doctor.User != null ? u.Doctor.User.Name : null,
         PatientId = u.PatientId,
         PatientName = u.Patient != null ? u.Patient.Name : null,
         AppointmentTime = u.TimeOfAppointment,
         Status = u.Status
     })
     .ToListAsync();
    }
}