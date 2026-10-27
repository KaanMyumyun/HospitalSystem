using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Calendar;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Calendar;

public class ScheduleQueryService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    ClinicClock clinic) : IScheduleQueryService
{
    public async Task<ServiceResult<List<ViewSchedule>>> ViewScheduleAsync(CancellationToken cancellationToken = default)
    {
        if (!currentUser.CanReadReferenceData())
            return ServiceResult<List<ViewSchedule>>.Forbidden("Not allowed to list schedules");

        var today = clinic.Today;
        var schedule = await context.Calendars
            .AsNoTracking()
            .Select(u => new ViewSchedule
            {
                ScheduleId = u.Id,
                DoctorId = u.DoctorId,
                StartTime = u.StartTime,
                EndTime = u.EndTime,
                SlotDurationMin = u.SlotDurationMin,
                WorkingDays = u.WorkingDays,
                BreakStartMinute = u.BreakStartMinute,
                BreakEndMinute = u.BreakEndMinute,
                TimeOff = u.TimeOff
                    .Where(t => t.LastDay >= today)
                    .OrderBy(t => t.FirstDay)
                    .Select(t => new TimeOffDto { TimeOffId = t.Id, FirstDay = t.FirstDay, LastDay = t.LastDay, Reason = t.Reason })
                    .ToList()
            })
            .ToListAsync(cancellationToken);

        return ServiceResult<List<ViewSchedule>>.Success(schedule);
    }
}