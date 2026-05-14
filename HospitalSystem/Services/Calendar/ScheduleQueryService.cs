using HospitalSystem.Interface;
using HospitalSystem.Interface.Calendar;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services;

public class ScheduleQueryService : IScheduleQueryService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ScheduleQueryService(ApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<ServiceResult<List<ViewSchedule>>> ViewScheduleAsync()
    {
        if (!_currentUser.IsInRole(UserRole.FrontDesk) &&
            !_currentUser.IsInRole(UserRole.Admin) &&
            !_currentUser.IsInRole(UserRole.DemoAdmin) &&
            !_currentUser.IsInRole(UserRole.DemoFrontDesk))
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
                SlotDurationMin = u.SlotDurationMin
            })
            .ToListAsync();

        return ServiceResult<List<ViewSchedule>>.Success(schedule);
    }
}