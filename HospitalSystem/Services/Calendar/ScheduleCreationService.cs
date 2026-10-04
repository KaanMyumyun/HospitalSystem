using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Calendar;

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

        // Unlike ChangeScheduleAsync, no overlap check: ValidateAsync has already
        // refused a doctor who has any schedule, so there is nothing to overlap.
        await using var transaction = await _context.Database.BeginTransactionAsync();

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
        await transaction.CommitAsync();

        return CalendarActionResult.Success();
    }
}
