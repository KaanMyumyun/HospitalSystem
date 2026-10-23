using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Calendar;

public static class ScheduleValidation
{
    // What the checks need to know about the schedule's doctor.
    public sealed record DoctorState(bool IsActive, bool DepartmentIsActive);

    // For a new schedule. Null when it can be created.
    public static async Task<CalendarActionResult?> ValidateAsync(
        ApplicationDbContext context,
        int doctorId,
        int startHour,
        int endHour,
        int slotDurationMin,
        IReadOnlyCollection<DayOfWeek>? workingDays)
    {
        if (doctorId <= 0)
            return CalendarActionResult.Fail("Doctor is required");

        var hoursError = ValidateHours(startHour, endHour, slotDurationMin) ?? ScheduleDays.Validate(workingDays);
        if (hoursError is not null)
            return CalendarActionResult.Fail(hoursError);

        var doctor = await context.Doctors
            .Where(d => d.Id == doctorId)
            .Select(d => new
            {
                State = new DoctorState(d.IsActive, d.Department.IsActive),
                HasSchedule = d.Calendars.Any()
            })
            .FirstOrDefaultAsync();

        var doctorError = ValidateDoctor(doctor?.State);
        if (doctorError is not null)
            return doctorError;

        if (doctor!.HasSchedule)
            return CalendarActionResult.Conflict("Doctor already has a schedule. Edit the existing schedule instead");

        return null;
    }

    // For a change to an existing schedule, whose own query reads the doctor.
    public static CalendarActionResult? Validate(
        DoctorState doctor,
        int startHour,
        int endHour,
        int slotDurationMin,
        IReadOnlyCollection<DayOfWeek>? workingDays)
    {
        var hoursError = ValidateHours(startHour, endHour, slotDurationMin) ?? ScheduleDays.Validate(workingDays);
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
