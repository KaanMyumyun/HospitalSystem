using Microsoft.EntityFrameworkCore;
using Npgsql;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Appointments;

namespace HospitalSystem.Services.Appointments;

public class AppointmentCreationService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IPatientService patientService,
    IAuditLogService auditLog,
    TimeProvider clock,
    ClinicClock clinic) : IAppointmentCreationService
{
    private const int MaxPossibleMatches = 10;

    public async Task<CreateAppointmentResultDto> CreateAppointmentAsync(
        CreateAppointmentDto dto, CancellationToken cancellationToken = default)
    {
        if (!currentUser.IsDesk())
            return CreateAppointmentResultDto.Forbidden("You are not allowed to create appointments");

        if (!int.TryParse(currentUser.UserId, out var frontDeskUserId))
            return CreateAppointmentResultDto.Forbidden("Sign in to create appointments");

        if (dto.AppointmentTime is not DateTimeOffset requestedTime)
            return CreateAppointmentResultDto.Fail("Appointment time is required");

        var now = clock.GetUtcNow();
        if (requestedTime <= now)
            return CreateAppointmentResultDto.Fail("Appointments cannot be booked in the past");

        var appointmentTime = requestedTime.UtcDateTime;
        var wallClock = clinic.WallClock(requestedTime);
        var requestedDay = DateOnly.FromDateTime(wallClock);
        var patientName = dto.PatientName?.Trim() ?? "";
        var patientNameKey = patientName.ToLowerInvariant();
        var phoneNumber = PatientDetails.NormalizePhoneNumber(dto.PhoneNumber);
        var dateOfBirth = dto.DateOfBirth;
        var chosenPatientId = dto.PatientId;
        var listPossibleMatches = chosenPatientId is null && !dto.CreateNewPatient;

        var doctor = await (
            from d in context.Doctors
            where d.Id == dto.DoctorId
            from c in d.Calendars.DefaultIfEmpty()
            let samePatientId = context.Patients
                .Where(p => p.PhoneNumber == phoneNumber && p.Name.ToLower() == patientNameKey && p.DateOfBirth == dateOfBirth)
                .OrderBy(p => p.Id)
                .Select(p => (int?)p.Id)
                .FirstOrDefault()
            select new
            {
                d.IsActive,
                d.User.Role,
                DepartmentIsActive = d.Department.IsActive,
                Schedule = c == null
                    ? null
                    : new BookingRules.WorkingHours(
                        c.StartTime, c.EndTime, c.SlotDurationMin, c.WorkingDays, c.BreakStartMinute, c.BreakEndMinute),
                IsAway = c != null && c.TimeOff.Any(t => t.FirstDay <= requestedDay && t.LastDay >= requestedDay),
                PreviousStart = d.Appointments
                    .Where(a => a.Status == AppointmentStatus.Scheduled && a.TimeOfAppointment <= appointmentTime)
                    .Max(a => (DateTime?)a.TimeOfAppointment),
                NextStart = d.Appointments
                    .Where(a => a.Status == AppointmentStatus.Scheduled && a.TimeOfAppointment > appointmentTime)
                    .Min(a => (DateTime?)a.TimeOfAppointment),
                SamePatientId = samePatientId,
                PossibleMatches = context.Patients
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
                ChosenPatientExists = chosenPatientId != null && context.Patients.Any(p => p.Id == chosenPatientId)
            })
            .FirstOrDefaultAsync(cancellationToken);
        if (doctor == null)
            return CreateAppointmentResultDto.NotFound("Doctor not found");

        if (!doctor.IsActive || doctor.Role != UserRole.Doctor)
            return CreateAppointmentResultDto.Fail("Doctor is not available for booking");

        if (!doctor.DepartmentIsActive)
            return CreateAppointmentResultDto.Fail("Doctor's department is not active");

        var validationError = ValidateAppointment(dto, requestedDay);
        if (validationError is not null)
            return CreateAppointmentResultDto.Fail(validationError);

        if (doctor.Schedule is not { } schedule)
            return CreateAppointmentResultDto.Fail("Doctor has no schedule");

        if (doctor.IsAway)
            return CreateAppointmentResultDto.Fail($"The doctor is away on {requestedDay:yyyy-MM-dd}");

        var scheduleError = BookingRules.CheckWorkingHours(schedule, wallClock);
        if (scheduleError is not null)
            return CreateAppointmentResultDto.Fail(scheduleError);

        if (BookingRules.Overlaps(appointmentTime, schedule.SlotDurationMin, doctor.PreviousStart, doctor.NextStart))
            return CreateAppointmentResultDto.Conflict("Doctor already booked for that time slot");

        if (chosenPatientId is not null && !doctor.ChosenPatientExists)
            return CreateAppointmentResultDto.NotFound("Patient not found");

        var patientId = chosenPatientId ?? doctor.SamePatientId;
        if (patientId is null && doctor.PossibleMatches.Count > 0)
        {
            return CreateAppointmentResultDto.PossibleMatch(
                "These details partly match a patient on file. Book for that patient, or register a new one.",
                doctor.PossibleMatches);
        }

        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

        var bookedPatientId = patientId
            ?? await patientService.CreatePatientAsync(patientName, phoneNumber, dateOfBirth!.Value, cancellationToken);

        var appointment = new AppointmentEntity
        {
            DoctorId = dto.DoctorId,
            PatientId = bookedPatientId,
            TimeOfAppointment = appointmentTime,
            CreatedAt = now.UtcDateTime,
            CreatedByTheFrontDeskId = frontDeskUserId,
            Status = AppointmentStatus.Scheduled
        };

        context.Appointments.Add(appointment);

        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            context.Entry(appointment).State = EntityState.Detached;
            return CreateAppointmentResultDto.Conflict("Doctor already booked for that time slot");
        }

        await auditLog.LogAsync(
            "CreateAppointment",
            "Appointment",
            appointment.Id,
            $"Created appointment for doctor {dto.DoctorId}",
            cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return CreateAppointmentResultDto.Success();
    }

    private static string? ValidateAppointment(CreateAppointmentDto dto, DateOnly requestedDay)
    {
        if (string.IsNullOrWhiteSpace(dto.PatientName))
            return "Patient name is required";

        var phoneError = PatientDetails.PhoneNumberError(dto.PhoneNumber);
        if (phoneError is not null)
            return phoneError;

        if (dto.DateOfBirth is null)
            return "Date of birth is required";

        if (dto.DateOfBirth > requestedDay)
            return "Date of birth cannot be after the appointment date";

        if (dto.PatientId is not null && dto.CreateNewPatient)
            return "Choose a patient on file or a new patient, not both";

        return null;
    }
}
