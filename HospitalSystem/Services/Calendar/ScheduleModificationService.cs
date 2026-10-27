using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Calendar;
using HospitalSystem.Services.Appointments;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Calendar;

public class ScheduleModificationService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog) : IScheduleModificationService
{
    public async Task<CalendarActionResult> ChangeScheduleAsync(
        ChangeScheduleDto dto, CancellationToken cancellationToken = default)
    {
        if (currentUser.RequireAdmin<CalendarActionResult>("change a schedule") is { } refusal)
            return refusal;

        if (string.IsNullOrWhiteSpace(dto.TimeZone) || !TimeZoneInfo.TryFindSystemTimeZoneById(dto.TimeZone, out var timeZone))
            return CalendarActionResult.Fail("A valid time zone is required, such as Europe/Sofia");

        // The doctor comes with the schedule: one query instead of two. A
        // doctor has no other schedule to overlap (IX_Calendars_DoctorId).
        var found = await context.Calendars
            .Where(c => c.Id == dto.ScheduleId)
            .Select(c => new
            {
                Calendar = c,
                Doctor = new ScheduleValidation.DoctorState(c.Doctor.IsActive, c.Doctor.Department.IsActive)
            })
            .FirstOrDefaultAsync(cancellationToken);
        if (found == null)
            return CalendarActionResult.NotFound("Schedule not found");

        var validationError = ScheduleValidation.Validate(
            found.Doctor,
            dto.StartHour,
            dto.EndHour,
            dto.SlotDurationMin,
            dto.WorkingDays);

        if (validationError is not null)
            return validationError;

        var calendar = found.Calendar;
        var workingDays = ScheduleDays.Normalize(dto.WorkingDays ?? calendar.WorkingDays);

        // Bookings already made must still fall on a working day, inside the
        // hours and on the slot grid, read as wall-clock times where the admin is.
        var future = await AffectedBookings.LoadFutureAsync(context, a => a.DoctorId == calendar.DoctorId, cancellationToken);
        var stranded = future
            .Where(a => !FitsSchedule(TimeZoneInfo.ConvertTimeFromUtc(a.TimeOfAppointment, timeZone), dto, workingDays))
            .ToList();
        var bookingRefusal = await AffectedBookings.ResolveAsync<CalendarActionResult>(
            stranded, dto, auditLog, $"schedule change for doctor {calendar.DoctorId}", cancellationToken);
        if (bookingRefusal is not null)
            return bookingRefusal;

        calendar.SetHours(dto.StartHour, dto.EndHour);
        calendar.SlotDurationMin = dto.SlotDurationMin;
        calendar.WorkingDays = workingDays;
        await auditLog.LogAsync(
            "ChangeSchedule",
            "Calendar",
            calendar.Id,
            $"Updated schedule for doctor {calendar.DoctorId}",
            cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        return CalendarActionResult.Success();
    }

    private static bool FitsSchedule(DateTime wallClock, ChangeScheduleDto dto, List<DayOfWeek> workingDays)
    {
        var minutes = wallClock.TimeOfDay.TotalMinutes;
        var startMinutes = dto.StartHour * 60;
        return workingDays.Contains(wallClock.DayOfWeek)
            && minutes >= startMinutes
            && minutes + dto.SlotDurationMin <= dto.EndHour * 60
            && (minutes - startMinutes) % dto.SlotDurationMin == 0;
    }
}
