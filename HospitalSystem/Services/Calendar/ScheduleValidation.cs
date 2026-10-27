using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Calendar;

public static class ScheduleValidation
{
    // What the checks need to know about the schedule's doctor.
    public sealed record DoctorState(bool IsActive, bool DepartmentIsActive);

    // A doctor has one schedule; changes edit it.
    public const string AlreadyScheduled = "Doctor already has a schedule. Edit the existing schedule instead";

    // For a new schedule. Null when it can be created.
    public static async Task<CalendarActionResult?> ValidateAsync(
        ApplicationDbContext context,
        int doctorId,
        int startHour,
        int endHour,
        int slotDurationMin,
        IReadOnlyCollection<DayOfWeek>? workingDays,
        int? breakStartMinute = null,
        int? breakEndMinute = null,
        CancellationToken cancellationToken = default)
    {
        if (doctorId <= 0)
            return CalendarActionResult.Fail("Doctor is required");

        var hoursError = ValidateHours(startHour, endHour, slotDurationMin)
            ?? ValidateBreak(startHour, endHour, breakStartMinute, breakEndMinute)
            ?? ScheduleDays.Validate(workingDays);
        if (hoursError is not null)
            return CalendarActionResult.Fail(hoursError);

        var doctor = await context.Doctors
            .Where(d => d.Id == doctorId)
            .Select(d => new
            {
                State = new DoctorState(d.IsActive, d.Department.IsActive),
                HasSchedule = d.Calendars.Any()
            })
            .FirstOrDefaultAsync(cancellationToken);

        var doctorError = ValidateDoctor(doctor?.State);
        if (doctorError is not null)
            return doctorError;

        if (doctor!.HasSchedule)
            return CalendarActionResult.Conflict(AlreadyScheduled);

        return null;
    }

    // For a change to an existing schedule, whose own query reads the doctor.
    public static CalendarActionResult? Validate(
        DoctorState doctor,
        int startHour,
        int endHour,
        int slotDurationMin,
        IReadOnlyCollection<DayOfWeek>? workingDays,
        int? breakStartMinute = null,
        int? breakEndMinute = null)
    {
        var hoursError = ValidateHours(startHour, endHour, slotDurationMin)
            ?? ValidateBreak(startHour, endHour, breakStartMinute, breakEndMinute)
            ?? ScheduleDays.Validate(workingDays);
        return hoursError is not null ? CalendarActionResult.Fail(hoursError) : ValidateDoctor(doctor);
    }

    private static string? ValidateHours(int startHour, int endHour, int slotDurationMin)
    {
        if (startHour < 0 || startHour > 23)
            return "Start hour must be between 0 and 23";

        if (endHour < 1 || endHour > 24)
            return "End hour must be between 1 and 24";

        if (startHour >= endHour)
            return "Start hour must be before end hour";

        if (slotDurationMin < 5 || slotDurationMin > 120)
            return "Slot duration must be between 5 and 120 minutes";

        var windowMinutes = (endHour - startHour) * 60;
        if (windowMinutes % slotDurationMin != 0)
            return "Slot duration must fit evenly inside the schedule window";

        return null;
    }

    // Both ends or neither, inside the working hours.
    private static string? ValidateBreak(int startHour, int endHour, int? breakStartMinute, int? breakEndMinute)
    {
        if (breakStartMinute is null && breakEndMinute is null)
            return null;

        if (breakStartMinute is not int breakStart || breakEndMinute is not int breakEnd)
            return "Give the break both a start and an end";

        if (breakStart >= breakEnd)
            return "The break must start before it ends";

        if (breakStart < startHour * 60 || breakEnd > endHour * 60)
            return "The break must be inside the working hours";

        if (breakStart == startHour * 60 && breakEnd == endHour * 60)
            return "The break cannot take the whole working day";

        return null;
    }

    private static CalendarActionResult? ValidateDoctor(DoctorState? doctor)
    {
        if (doctor is null)
            return CalendarActionResult.NotFound("Doctor not found");

        if (!doctor.IsActive)
            return CalendarActionResult.Fail("Cannot schedule an inactive doctor");

        if (!doctor.DepartmentIsActive)
            return CalendarActionResult.Fail("Cannot schedule a doctor in an inactive department");

        return null;
    }
}
