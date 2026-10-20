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

    private const int MaxPossibleMatches = 10;
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
        var patientName = dto.PatientName?.Trim() ?? "";
        var patientNameKey = patientName.ToLowerInvariant();
        var phoneNumber = NormalizePhoneNumber(dto.PhoneNumber);
        var dateOfBirth = dto.DateOfBirth;
        var chosenPatientId = dto.PatientId;
        // Possible matches only matter while the desk has not yet picked a
        // patient on file or asked for a new one.
        var listPossibleMatches = chosenPatientId is null && !dto.CreateNewPatient;

        // Fetched together so the checks below and the patient lookup cost one
        // round trip, not four.
        var doctor = await (
            from d in _context.Doctors
            where d.Id == dto.DoctorId
            // A join, not FirstOrDefault on d.Calendars, which EF turns into a
            // numbering of every schedule on file; the join reads this
            // doctor's from the DoctorId index.
            from c in d.Calendars.DefaultIfEmpty()
            let samePatientId = _context.Patients
                .Where(p => p.PhoneNumber == phoneNumber && p.Name.ToLower() == patientNameKey && p.DateOfBirth == dateOfBirth)
                .OrderBy(p => p.Id)
                .Select(p => (int?)p.Id)
                .FirstOrDefault()
            // A doctor with more than one schedule is booked against the first.
            orderby c.Id
            select new
            {
                d.IsActive,
                d.User.Role,
                DepartmentIsActive = d.Department.IsActive,
                Schedule = c == null ? null : new WorkingHours(c.StartTime, c.EndTime, c.SlotDurationMin),
                // The nearest bookings on either side. Whether they overlap
                // depends on the slot length, known once the schedule is loaded.
                PreviousStart = d.Appointments
                    .Where(a => a.Status == AppointmentStatus.Scheduled && a.TimeOfAppointment <= appointmentTime)
                    .Max(a => (DateTime?)a.TimeOfAppointment),
                NextStart = d.Appointments
                    .Where(a => a.Status == AppointmentStatus.Scheduled && a.TimeOfAppointment > appointmentTime)
                    .Min(a => (DateTime?)a.TimeOfAppointment),
                SamePatientId = samePatientId,
                // Someone on file with the same phone number, or the same name
                // and date of birth, may be the patient being booked. Not read
                // when a patient matches exactly, so a phone that many patients
                // share costs nothing on a booking for one of them.
                PossibleMatches = _context.Patients
                    .Where(p => listPossibleMatches && samePatientId == null
                        && (p.PhoneNumber == phoneNumber || (p.Name.ToLower() == patientNameKey && p.DateOfBirth == dateOfBirth)))
                    .OrderBy(p => p.Name)
                    .ThenBy(p => p.Id)
                    .Take(MaxPossibleMatches)
                    .Select(p => new PatientMatchDto
                    {
                        PatientId = p.Id,
                        Name = p.Name,
                        DateOfBirth = p.DateOfBirth,
                        PhoneNumber = p.PhoneNumber
                    })
                    .ToList(),
                ChosenPatientExists = chosenPatientId != null && _context.Patients.Any(p => p.Id == chosenPatientId)
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

        if (doctor.Schedule is not { } schedule)
            return CreateAppointmentResultDto.Fail("Doctor has no schedule");

        var scheduleError = CheckWorkingHours(schedule, requestedTime);
        if (scheduleError is not null)
            return CreateAppointmentResultDto.Fail(scheduleError);

        // Every booking lasts one slot, so another booking overlaps this one
        // when it starts less than a slot before or after it.
        var slotLength = TimeSpan.FromMinutes(schedule.SlotDurationMin);
        if (doctor.PreviousStart > appointmentTime - slotLength || doctor.NextStart < appointmentTime + slotLength)
            return CreateAppointmentResultDto.Fail("Doctor already booked for that time slot");

        if (chosenPatientId is not null && !doctor.ChosenPatientExists)
            return CreateAppointmentResultDto.Fail("Patient not found");

        // A patient whose phone number, name and date of birth all match is
        // booked again. When only some match (a relative sharing a phone, a
        // typo, a new number), the desk sees the matches and books again with
        // PatientId or CreateNewPatient.
        var patientId = chosenPatientId ?? doctor.SamePatientId;
        if (patientId is null && doctor.PossibleMatches.Count > 0)
        {
            return CreateAppointmentResultDto.FailPossibleMatch(
                "These details partly match a patient on file. Book for that patient, or register a new one.",
                doctor.PossibleMatches);
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var bookedPatientId = patientId
            ?? await _patientService.CreatePatientAsync(patientName, phoneNumber, dateOfBirth!.Value);

        var appointment = new AppointmentsEntity
        {
            DoctorId = dto.DoctorId,
            PatientId = bookedPatientId,
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

        if (dto.PatientId is not null && dto.CreateNewPatient)
            return "Choose a patient on file or a new patient, not both";

        return null;
    }

    // Patients are stored and matched by digits only, keeping a leading +, so
    // "+359 888 111-222" and "+359888111222" are the same number.
    private static string NormalizePhoneNumber(string? phoneNumber)
    {
        var trimmed = phoneNumber?.Trim() ?? "";
        var digits = string.Concat(trimmed.Where(char.IsAsciiDigit));
        return trimmed.StartsWith('+') ? "+" + digits : digits;
    }

    // Working hours are whole wall-clock hours, compared with the time as the
    // desk sent it, not with its UTC equivalent.
    private static string? CheckWorkingHours(WorkingHours schedule, DateTimeOffset requestedTime)
    {
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
