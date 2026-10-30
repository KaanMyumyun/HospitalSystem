using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Calendar;
using HospitalSystem.Services.Appointments;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Calendar;

public class TimeOffService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog,
    ClinicClock clinic) : ITimeOffService
{
    private const int MaxDays = 366;

    public async Task<CalendarActionResult> AddTimeOffAsync(AddTimeOffDto dto, CancellationToken cancellationToken = default)
    {
        if (currentUser.RequireAdmin<CalendarActionResult>("add time off") is { } refusal)
            return refusal;

        if (dto.FirstDay is not DateOnly firstDay || dto.LastDay is not DateOnly lastDay)
            return CalendarActionResult.Fail("The first and the last day are required");

        if (lastDay < firstDay)
            return CalendarActionResult.Fail("The last day cannot be before the first");

        if (lastDay < clinic.Today)
            return CalendarActionResult.Fail("Time off cannot end in the past");

        if (lastDay.DayNumber - firstDay.DayNumber >= MaxDays)
            return CalendarActionResult.Fail("Time off can be at most a year long");

        var found = await context.Calendars
            .Where(c => c.Id == dto.ScheduleId)
            .Select(c => new
            {
                Calendar = c,
                Overlapping = c.TimeOff
                    .Where(t => t.FirstDay <= lastDay && t.LastDay >= firstDay)
                    .Select(t => new { t.FirstDay, t.LastDay })
                    .FirstOrDefault()
            })
            .FirstOrDefaultAsync(cancellationToken);
        if (found == null)
            return CalendarActionResult.NotFound("Schedule not found");

        if (found.Overlapping is { } other)
            return CalendarActionResult.Conflict(
                $"This overlaps time off from {other.FirstDay:yyyy-MM-dd} to {other.LastDay:yyyy-MM-dd}");

        var calendar = found.Calendar;
        var from = clinic.ToUtc(firstDay.ToDateTime(TimeOnly.MinValue));
        var to = clinic.ToUtc(lastDay.AddDays(1).ToDateTime(TimeOnly.MinValue));
        var stranded = await AffectedBookings.LoadFutureAsync(
            context,
            a => a.DoctorId == calendar.DoctorId && a.TimeOfAppointment >= from && a.TimeOfAppointment < to,
            cancellationToken);
        var bookingRefusal = await AffectedBookings.ResolveAsync<CalendarActionResult>(
            stranded, dto, auditLog, $"time off for doctor {calendar.DoctorId}", cancellationToken);
        if (bookingRefusal is not null)
            return bookingRefusal;

        var reason = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim();
        context.TimeOff.Add(new TimeOffEntity { CalendarId = calendar.Id, FirstDay = firstDay, LastDay = lastDay, Reason = reason });
        await auditLog.LogAsync(
            "AddTimeOff",
            "Calendar",
            calendar.Id,
            $"Doctor {calendar.DoctorId} away from {firstDay:yyyy-MM-dd} to {lastDay:yyyy-MM-dd}{(reason is null ? "" : $": {reason}")}",
            cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        return CalendarActionResult.Success();
    }

    public async Task<CalendarActionResult> RemoveTimeOffAsync(
        int scheduleId, int timeOffId, CancellationToken cancellationToken = default)
    {
        if (currentUser.RequireAdmin<CalendarActionResult>("remove time off") is { } refusal)
            return refusal;

        var timeOff = await context.TimeOff
            .Include(t => t.Calendar)
            .FirstOrDefaultAsync(t => t.Id == timeOffId && t.CalendarId == scheduleId, cancellationToken);
        if (timeOff == null)
            return CalendarActionResult.NotFound("Time off not found");

        context.TimeOff.Remove(timeOff);
        await auditLog.LogAsync(
            "RemoveTimeOff",
            "Calendar",
            scheduleId,
            $"Doctor {timeOff.Calendar.DoctorId} no longer away from {timeOff.FirstDay:yyyy-MM-dd} to {timeOff.LastDay:yyyy-MM-dd}",
            cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        return CalendarActionResult.Success();
    }
}
