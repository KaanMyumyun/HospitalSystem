using Microsoft.EntityFrameworkCore;
using Npgsql;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Appointments;
using System.Text.RegularExpressions;

namespace HospitalSystem.Services.Appointments;
 
public class AppointmentCreationService : IAppointmentCreationService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IPatientService _patientService;
    private readonly IAuditLogService _auditLog;

    private static readonly TimeSpan AppointmentDuration = TimeSpan.FromMinutes(15);
    private static readonly Regex AllowedPhoneCharacters = new(@"^\+?[0-9\s().-]+$", RegexOptions.Compiled);

    public AppointmentCreationService(
        ApplicationDbContext context,
        ICurrentUserService currentUser,
        IPatientService patientService,
        IAuditLogService auditLog)
    {
        _context = context;
        _currentUser = currentUser;
        _patientService = patientService;
        _auditLog = auditLog;
    }
 
    public async Task<CreateAppointmentResultDto> CreateAppointmentAsync(CreateAppointmentDto dto, int frontDeskUserId)
    {
        if (!_currentUser.IsInRole(UserRole.FrontDesk))
            return CreateAppointmentResultDto.Fail("You are not allowed to create appointments");

        if (dto.AppointmentTime is not DateTimeOffset requestedTime)
            return CreateAppointmentResultDto.Fail("Appointment time is required");

        var appointmentTime = requestedTime.UtcDateTime;
        var earliestOverlappingStart = appointmentTime.Subtract(AppointmentDuration);
        var appointmentEnd = appointmentTime.Add(AppointmentDuration);

        // Fetched together so the checks below and the patient lookup cost one
        // round trip, not four.
        var doctor = await _context.Doctors
            .Where(d => d.Id == dto.DoctorId)
            .Select(d => new
            {
                d.IsActive,
                d.User.Role,
                DepartmentIsActive = d.Department.IsActive,
                Schedule = d.Calendars
                    .Select(c => new WorkingHours(c.StartTime, c.EndTime, c.SlotDurationMin))
                    .FirstOrDefault(),
                HasOverlap = d.Appointments.Any(a =>
                    a.Status == AppointmentStatus.Scheduled &&
                    a.TimeOfAppointment > earliestOverlappingStart &&
                    a.TimeOfAppointment < appointmentEnd),
                ExistingPatientId = _context.Patients
                    .Where(p => p.PhoneNumber == dto.PhoneNumber)
                    .Select(p => (int?)p.Id)
                    .FirstOrDefault()
            })
            .FirstOrDefaultAsync();
        if (doctor == null)
            return CreateAppointmentResultDto.Fail("Doctor not found");

        if (!doctor.IsActive || doctor.Role != UserRole.Doctor)
            return CreateAppointmentResultDto.Fail("Doctor is not available for booking");

        if (!doctor.DepartmentIsActive)
            return CreateAppointmentResultDto.Fail("Doctor's department is not active");

        var validationError = ValidateAppointment(dto, requestedTime);
        if (validationError is not null)
            return CreateAppointmentResultDto.Fail(validationError);

        var scheduleError = CheckWorkingHours(doctor.Schedule, requestedTime);
        if (scheduleError is not null)
            return CreateAppointmentResultDto.Fail(scheduleError);

        if (doctor.HasOverlap)
            return CreateAppointmentResultDto.Fail("Doctor already booked for that time slot");
 
        await using var transaction = await _context.Database.BeginTransactionAsync();

        var patientId = doctor.ExistingPatientId
            ?? await _patientService.CreatePatientAsync(dto.PatientName, dto.PhoneNumber, dto.DateOfBirth!.Value);
 
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

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            _context.Entry(appointment).State = EntityState.Detached;
            return CreateAppointmentResultDto.FailConflict("Doctor already booked for that time slot");
        }

        await _auditLog.LogAsync("CreateAppointment", "Appointment", appointment.Id, $"Created appointment for doctor {dto.DoctorId}");
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return CreateAppointmentResultDto.Success();
    }

    private static string? ValidateAppointment(CreateAppointmentDto dto, DateTimeOffset requestedTime)
    {
        var patientName = dto.PatientName?.Trim();
        var phoneNumber = dto.PhoneNumber?.Trim();

        if (string.IsNullOrWhiteSpace(patientName))
            return "Patient name is required";

        if (string.IsNullOrWhiteSpace(phoneNumber))
            return "Phone number is required";

        var digitCount = phoneNumber.Count(char.IsDigit);
        if (!AllowedPhoneCharacters.IsMatch(phoneNumber) || digitCount < 7 || digitCount > 15)
            return "Phone number must contain 7 to 15 digits and no letters";

        if (dto.DateOfBirth is null)
            return "Date of birth is required";

        if (dto.DateOfBirth > DateOnly.FromDateTime(requestedTime.DateTime))
            return "Date of birth cannot be after the appointment date";

        return null;
    }
 
    // Working hours are whole wall-clock hours, compared with the time as the
    // desk sent it, not with its UTC equivalent.
    private static string? CheckWorkingHours(WorkingHours? schedule, DateTimeOffset requestedTime)
    {
        if (schedule == null)
            return "Doctor has no schedule";

        // Stored on a placeholder date; an end hour of 24 is midnight of the next day.
        var startMinutes = (schedule.StartTime - schedule.StartTime.Date).TotalMinutes;
        var endMinutes = (schedule.EndTime - schedule.StartTime.Date).TotalMinutes;
        var requestedMinutes = requestedTime.TimeOfDay.TotalMinutes;

        if (requestedMinutes < startMinutes || requestedMinutes + schedule.SlotDurationMin > endMinutes)
            return "Appointment time is outside the doctor's working hours";

        return null;
    }

    private sealed record WorkingHours(DateTime StartTime, DateTime EndTime, int SlotDurationMin);
}
