using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Calendar;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Calendar;

public class ScheduleQueryService(
    ApplicationDbContext context,
    ICurrentUserService currentUser) : IScheduleQueryService
{
    public async Task<ServiceResult<List<ViewSchedule>>> ViewScheduleAsync()
    {
        if (!currentUser.CanReadReferenceData())
            return ServiceResult<List<ViewSchedule>>.Forbidden("Not allowed to list schedules");

        var schedule = await context.Calendars
            .AsNoTracking()
            .Select(u => new ViewSchedule
            {
                ScheduleId = u.Id,
                DoctorId = u.DoctorId,
                StartTime = u.StartTime,
                EndTime = u.EndTime,
                SlotDurationMin = u.SlotDurationMin,
                WorkingDays = u.WorkingDays
            })
            .ToListAsync();

        return ServiceResult<List<ViewSchedule>>.Success(schedule);
    }
}