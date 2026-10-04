using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Calendar;

internal static class ScheduleValidation
{
    public static async Task<string?> ValidateAsync(
        ApplicationDbContext context,
        int doctorId,
        int startHour,
        int endHour,
        int slotDurationMin,
        int? currentScheduleId = null)
    {
        if (doctorId <= 0)
            return "Doctor is required";

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

        var doctor = await context.Doctors
            .Where(d => d.Id == doctorId)
            .Select(d => new
            {
                d.IsActive,
                DepartmentIsActive = d.Department.IsActive,
                HasSchedule = d.Calendars.Any()
            })
            .FirstOrDefaultAsync();

        if (doctor is null)
            return "Doctor not found";

        if (!doctor.IsActive)
            return "Cannot schedule an inactive doctor";

        if (!doctor.DepartmentIsActive)
            return "Cannot schedule a doctor in an inactive department";

        if (!currentScheduleId.HasValue && doctor.HasSchedule)
            return "Doctor already has a schedule. Edit the existing schedule instead";

        return null;
    }
}
