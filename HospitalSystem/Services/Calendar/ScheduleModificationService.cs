using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Calendar;
using HospitalSystem.Services.Appointments;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Calendar;

public class ScheduleModificationService : IScheduleModificationService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public ScheduleModificationService(ApplicationDbContext context, ICurrentUserService currentUser, IAuditLogService auditLog)
    {
        _context = context;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    public async Task<CalendarActionResult> ChangeScheduleAsync(ChangeScheduleDto dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return CalendarActionResult.Forbidden("You are not allowed to change a schedule");

        if (string.IsNullOrWhiteSpace(dto.TimeZone) || !TimeZoneInfo.TryFindSystemTimeZoneById(dto.TimeZone, out var timeZone))
            return CalendarActionResult.Fail("A valid time zone is required, such as Europe/Sofia");

        // The doctor and the doctor's other schedules come with the schedule:
        // one query instead of three. Doctors normally have no other schedule.
        var found = await _context.Calendars
            .Where(c => c.Id == dto.ScheduleId)
            .Select(c => new
            {
                Calendar = c,
                Doctor = new ScheduleValidation.DoctorState(c.Doctor.IsActive, c.Doctor.Department.IsActive),
                OtherSchedules = _context.Calendars
                    .Where(u => u.DoctorId == c.DoctorId && u.Id != c.Id)
                    .Select(u => new { u.StartTime, u.EndTime })
                    .ToList()
            })
            .FirstOrDefaultAsync();
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

        var baseDate = DateTime.UtcNow.Date;
        var start = baseDate.AddHours(dto.StartHour);
        var end = baseDate.AddHours(dto.EndHour);

        if (found.OtherSchedules.Any(u => u.EndTime > start && u.StartTime < end))
            return CalendarActionResult.Conflict("Schedule already exists for this time range");

        var calendar = found.Calendar;
        var workingDays = ScheduleDays.Normalize(dto.WorkingDays ?? calendar.WorkingDays);

        // Bookings already made must still fall on a working day, inside the
        // hours and on the slot grid, read as wall-clock times where the admin is.
        var future = await AffectedBookings.LoadFutureAsync(_context, a => a.DoctorId == calendar.DoctorId);
        var stranded = future
            .Where(a => !FitsSchedule(TimeZoneInfo.ConvertTimeFromUtc(a.TimeOfAppointment, timeZone), dto, workingDays))
            .ToList();
        var refusal = await AffectedBookings.ResolveAsync<CalendarActionResult>(
            stranded, dto, _auditLog, $"schedule change for doctor {calendar.DoctorId}");
        if (refusal is not null)
            return refusal;

        calendar.StartTime = start;
        calendar.EndTime = end;
        calendar.SlotDurationMin = dto.SlotDurationMin;
        calendar.WorkingDays = workingDays;
        await _auditLog.LogAsync("ChangeSchedule", "Calendar", calendar.Id, $"Updated schedule for doctor {calendar.DoctorId}");
        await _context.SaveChangesAsync();
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
