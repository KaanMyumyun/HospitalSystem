using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Calendar;
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
            return CalendarActionResult.Fail("You are not allowed to change a schedule");

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
            return CalendarActionResult.Fail("Schedule not found");

        var validationError = ScheduleValidation.Validate(
            found.Doctor,
            dto.StartHour,
            dto.EndHour,
            dto.SlotDurationMin);

        if (validationError is not null)
            return CalendarActionResult.Fail(validationError);

        var baseDate = DateTime.UtcNow.Date;
        var start = baseDate.AddHours(dto.StartHour);
        var end = baseDate.AddHours(dto.EndHour);

        if (found.OtherSchedules.Any(u => u.EndTime > start && u.StartTime < end))
            return CalendarActionResult.Fail("Schedule already exists for this time range");

        var calendar = found.Calendar;
        calendar.StartTime = start;
        calendar.EndTime = end;
        calendar.SlotDurationMin = dto.SlotDurationMin;
        await _auditLog.LogAsync("ChangeSchedule", "Calendar", calendar.Id, $"Updated schedule for doctor {calendar.DoctorId}");
        await _context.SaveChangesAsync();
        return CalendarActionResult.Success();
    }
}
