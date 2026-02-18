namespace HospitalSystem.Services;

using System.Dynamic;
using HospitalSystem.Interface;
using Microsoft.EntityFrameworkCore;

public class CalendarService : ICalendarService
{
     private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CalendarService(ApplicationDbContext context, ICurrentUserService currentUser)
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
    var end   = dummyDate.AddHours(dto.EndHour);

    var exist = await _context.Calendars.AnyAsync(u =>
        u.DoctorId == dto.DoctorId &&
        u.EndTime > start &&
        u.StartTime < end);

    if (exist)
        return CalendarActionResult.Fail("Schedule already exists for this time range");

    _context.Calendars.Add(new CalendarEntity
    {
        DoctorId  = dto.DoctorId,
        StartTime = start, 
        EndTime   = end,
        SlotDurationMin = dto.SlotDurationMin //custom duration
    });

    await _context.SaveChangesAsync();
    return CalendarActionResult.Success();
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
    var end   = baseDate.AddHours(dto.EndHour); 

    var exist = await _context.Calendars.AnyAsync(u =>
        u.DoctorId == calendar.DoctorId &&
        u.Id != dto.ScheduleId &&
        u.EndTime > start &&
        u.StartTime < end);

    if (exist)
        return CalendarActionResult.Fail("Schedule already exists for this time range");

    calendar.StartTime = start;  // entity setter handles UTC automatically
    calendar.EndTime   = end;
    calendar.SlotDurationMin = dto.SlotDurationMin;
    await _context.SaveChangesAsync();
    return CalendarActionResult.Success();
}
    public async Task<ServiceResult<List<ViewSchedule>>> ViewScheduleAsync()
    {
           
        if (!_currentUser.IsInRole(UserRole.FrontDesk)&& !_currentUser.IsInRole(UserRole.Admin))
        {
            return ServiceResult<List<ViewSchedule>>
                .Fail("Not allowed to list deparments");
        }
        var schedule = await _context.Calendars
      .AsNoTracking()
      .Select(u => new ViewSchedule
      {
         ScheduleId = u.Id,
         DoctorId = u.DoctorId,
         StartTime = u.StartTime,
         EndTime = u.EndTime,
         SlotDurationMin= u.SlotDurationMin
      })
      .ToListAsync();

        return ServiceResult<List<ViewSchedule>>.Success(schedule);
    }
    
}