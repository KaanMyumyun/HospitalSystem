// using Microsoft.EntityFrameworkCore;
// using HospitalSystem.Interface;
// namespace HospitalSystem.Services;

// public class AppointmentService : IAppointmentService
// {
//     private readonly ApplicationDbContext _context;
//     private readonly ICurrentUserService _currentUser;

//     public AppointmentService(ApplicationDbContext context, ICurrentUserService currentUser)
//     {
//         _context = context;
//         _currentUser = currentUser;
//     }
//     public async Task<CancelAppointmentResultDto> CancelAppointmentAsync(CancelAppointmentDto dto)
//     {
//         if (!_currentUser.IsInRole(UserRole.FrontDesk))
//         {
//             return CancelAppointmentResultDto.Fail("You are not allowed to reset password");
//         }
//         var appointment = await _context.Appointments.SingleOrDefaultAsync(a => a.Id == dto.AppointmentId);
//         if (appointment == null)
//         {
//             return CancelAppointmentResultDto.Fail("Appointment not found");
//         }
//         if (string.IsNullOrWhiteSpace(dto.Reason))
//         {
//             return CancelAppointmentResultDto.Fail("Cancellation reason is required");
//         }


//         if (appointment.Status == AppointmentStatus.Cancelled)
//         {
//             return CancelAppointmentResultDto.Fail("Appointment already canceled");
//         }

//         appointment.Status = AppointmentStatus.Cancelled;
//         appointment.CancellationReason = dto.Reason;
//         appointment.CancelledAt = DateTime.UtcNow;

       
//         await _context.SaveChangesAsync();
//         return CancelAppointmentResultDto.Success();
//     }

// public async Task<CreateAppointmentResultDto> CreateAppointmentAsync(CreateAppointmentDto dto, int frontDeskUserId)
// {
//     if (!_currentUser.IsInRole(UserRole.FrontDesk))
//     {
//         return CreateAppointmentResultDto.Fail("You are not allowed to create appointments");
//     }

//     var doctorExist = await _context.Doctors.AnyAsync(u => u.Id == dto.DoctorId);
//     if (!doctorExist)
//     {
//         return CreateAppointmentResultDto.Fail("Doctor not found");
//     }

//     var existingPatient = await _context.Patients
//         .FirstOrDefaultAsync(p => p.PhoneNumber == dto.PhoneNumber);
    
//     int patientId;
    
//     if (existingPatient != null)
//     {
//         patientId = existingPatient.Id;
//     }
//     else
//     {
//         var newPatient = new PatientEntity
//         {
//             Name = dto.PatientName,
//             PhoneNumber = dto.PhoneNumber,
//             DateOfBirth = DateTime.SpecifyKind(dto.DateOfBirth, DateTimeKind.Utc)
//         };
//         _context.Patients.Add(newPatient);
//         await _context.SaveChangesAsync();
//         patientId = newPatient.Id;
//     }

    
//     var appointmentTime = DateTime.SpecifyKind(dto.AppointmentTime, DateTimeKind.Utc);
//     var duration = TimeSpan.FromMinutes(15);
//     var appointmentEnd = appointmentTime.Add(duration);
    
//     var existingAppointments = await _context.Appointments
//         .Where(a => 
//             a.DoctorId == dto.DoctorId &&
//             a.Status == AppointmentStatus.Scheduled &&
//             a.TimeOfAppointment.Date == appointmentTime.Date 
//         )
//         .Select(a => new { a.TimeOfAppointment })
//         .ToListAsync(); 
    
//     var overlap = existingAppointments.Any(a =>
//     {
//         var existingEnd = a.TimeOfAppointment.Add(duration);
//         return appointmentTime < existingEnd && appointmentEnd > a.TimeOfAppointment;
//     });
    
//     if (overlap)
//     {
//         return CreateAppointmentResultDto.Fail("Doctor already booked for that time slot");
//     }

//     var appointment = new AppointmentsEntity
//     {
//         DoctorId = dto.DoctorId,
//         PatientId = patientId,
//         TimeOfAppointment = appointmentTime,
//         CreatedAt = DateTime.UtcNow,
//         CreatedByTheFrontDeskId = frontDeskUserId,
//         Status = AppointmentStatus.Scheduled
//     };

//     _context.Appointments.Add(appointment);
//     await _context.SaveChangesAsync();

//     return CreateAppointmentResultDto.Success();
// }
//     public async Task<ServiceResult<List<ViewAppointmentDto>>> GetAppointmentsAsync()
//     {   
//         if (!_currentUser.IsInRole(UserRole.FrontDesk)&&!_currentUser.IsInRole(UserRole.DemoFrontDesk))
//         {
//             return ServiceResult<List<ViewAppointmentDto>>
//                 .Fail("Not allowed to list deparments");
//         }
//         var appointment = await _context.Appointments
//       .AsNoTracking()
//       .Select(u => new ViewAppointmentDto
//       {
//           AppointmentId = u.Id,
//           DoctorId = u.DoctorId,
//           DoctorName = u.Doctor != null && u.Doctor.User != null ? u.Doctor.User.Name : null,
//           PatientId = u.PatientId,
//           PatientName = u.Patient != null ? u.Patient.Name : null,
//           AppointmentTime = u.TimeOfAppointment,
//           Status = u.Status
//       })
//       .ToListAsync();

//         return ServiceResult<List<ViewAppointmentDto>>.Success(appointment);
//     }
// }