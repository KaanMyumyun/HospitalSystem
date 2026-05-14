using HospitalSystem.Interface;
using HospitalSystem.Interface.Calendar;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services;

public class ScheduleCreationService : IScheduleCreationService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ScheduleCreationService(ApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<CalendarActionResult> CreateScheduleAsync(CreateSchedule dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return CalendarActionResult.Fail("You are not allowed to create a schedule");

        if (dto.StartHour >= dto.EndHour)
            return CalendarActionResult.Fail("Start hour must be before end hour");

        var dummyDate = new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var start = dummyDate.AddHours(dto.StartHour);
        var end = dummyDate.AddHours(dto.EndHour);

        var exist = await _context.Calendars.AnyAsync(u =>
            u.DoctorId == dto.DoctorId &&
            u.EndTime > start &&
            u.StartTime < end);

        if (exist)
            return CalendarActionResult.Fail("Schedule already exists for this time range");

        _context.Calendars.Add(new CalendarEntity
        {
            DoctorId = dto.DoctorId,
            StartTime = start,
            EndTime = end,
            SlotDurationMin = dto.SlotDurationMin
        });

        await _context.SaveChangesAsync();
        return CalendarActionResult.Success();
    }
}