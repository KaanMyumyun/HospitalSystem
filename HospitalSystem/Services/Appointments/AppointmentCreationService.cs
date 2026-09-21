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
 
        var doctor = await _context.Doctors
            .Where(d => d.Id == dto.DoctorId)
            .Select(d => new { d.IsActive, d.User.Role })
            .FirstOrDefaultAsync();
        if (doctor == null)
            return CreateAppointmentResultDto.Fail("Doctor not found");

        if (!doctor.IsActive || doctor.Role != UserRole.Doctor)
            return CreateAppointmentResultDto.Fail("Doctor is not available for booking");
 
        if (dto.AppointmentTime is null)
            return CreateAppointmentResultDto.Fail("Appointment time is required");

        var appointmentTime = DateTime.SpecifyKind(dto.AppointmentTime.Value, DateTimeKind.Utc);

        var validationError = ValidateAppointment(dto, appointmentTime);
        if (validationError is not null)
            return CreateAppointmentResultDto.Fail(validationError);
 
        if (await HasOverlapAsync(dto.DoctorId, appointmentTime))
            return CreateAppointmentResultDto.Fail("Doctor already booked for that time slot");
 
        await using var transaction = await _context.Database.BeginTransactionAsync();

        var patientId = await _patientService.GetOrCreatePatientAsync(
            dto.PatientName, dto.PhoneNumber, dto.DateOfBirth!.Value);
 
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

    private static string? ValidateAppointment(CreateAppointmentDto dto, DateTime appointmentTime)
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

        if (dto.DateOfBirth > DateOnly.FromDateTime(appointmentTime))
            return "Date of birth cannot be after the appointment date";

        return null;
    }
 
    private async Task<bool> HasOverlapAsync(int doctorId, DateTime appointmentTime)
    {
        var earliestOverlappingStart = appointmentTime.Subtract(AppointmentDuration);
        var appointmentEnd = appointmentTime.Add(AppointmentDuration);

        return await _context.Appointments
            .AnyAsync(a =>
                a.DoctorId == doctorId &&
                a.Status == AppointmentStatus.Scheduled &&
                a.TimeOfAppointment > earliestOverlappingStart &&
                a.TimeOfAppointment < appointmentEnd);
    }
}
