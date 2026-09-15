using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Calendar;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Calendar;

public class ScheduleCreationService : IScheduleCreationService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditLogService _auditLog;

    public ScheduleCreationService(ApplicationDbContext context, ICurrentUserService currentUser, IAuditLogService auditLog)
    {
        _context = context;
        _currentUser = currentUser;
        _auditLog = auditLog;
    }

    public async Task<CalendarActionResult> CreateScheduleAsync(CreateSchedule dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return CalendarActionResult.Fail("You are not allowed to create a schedule");

        var validationError = await ScheduleValidation.ValidateAsync(
            _context,
            dto.DoctorId,
            dto.StartHour,
            dto.EndHour,
            dto.SlotDurationMin);

        if (validationError is not null)
            return CalendarActionResult.Fail(validationError);

        var dummyDate = new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var start = dummyDate.AddHours(dto.StartHour);
        var end = dummyDate.AddHours(dto.EndHour);

        var exist = await _context.Calendars.AnyAsync(u =>
            u.DoctorId == dto.DoctorId &&
            u.EndTime > start &&
            u.StartTime < end);

        if (exist)
            return CalendarActionResult.Fail("Schedule already exists for this time range");

        var calendar = new CalendarEntity
        {
            DoctorId = dto.DoctorId,
            StartTime = start,
            EndTime = end,
            SlotDurationMin = dto.SlotDurationMin
        };
        _context.Calendars.Add(calendar);
        await _context.SaveChangesAsync();

        await _auditLog.LogAsync("CreateSchedule", "Calendar", calendar.Id, $"Created schedule for doctor {dto.DoctorId}");
        await _context.SaveChangesAsync();

        return CalendarActionResult.Success();
    }
}
