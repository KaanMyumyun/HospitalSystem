using HospitalSystem.Interface;
using HospitalSystem.Interface.Calendar;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services;

public class ScheduleModificationService : IScheduleModificationService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ScheduleModificationService(ApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<CalendarActionResult> ChangeScheduleAsync(ChangeScheduleDto dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return CalendarActionResult.Fail("You are not allowed to change a schedule");

        var calendar = await _context.Calendars.FirstOrDefaultAsync(c => c.Id == dto.ScheduleId);
        if (calendar == null)
            return CalendarActionResult.Fail("Schedule not found");

        if (dto.StartHour >= dto.EndHour)
            return CalendarActionResult.Fail("Start hour must be before end hour");

        var baseDate = DateTime.UtcNow.Date;
        var start = baseDate.AddHours(dto.StartHour);
        var end = baseDate.AddHours(dto.EndHour);

        var exist = await _context.Calendars.AnyAsync(u =>
            u.DoctorId == calendar.DoctorId &&
            u.Id != dto.ScheduleId &&
            u.EndTime > start &&
            u.StartTime < end);

        if (exist)
            return CalendarActionResult.Fail("Schedule already exists for this time range");

        calendar.StartTime = start;
        calendar.EndTime = end;
        calendar.SlotDurationMin = dto.SlotDurationMin;
        await _context.SaveChangesAsync();
        return CalendarActionResult.Success();
    }
}