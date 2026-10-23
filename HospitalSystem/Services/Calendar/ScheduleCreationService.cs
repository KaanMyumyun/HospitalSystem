using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Calendar;

namespace HospitalSystem.Services.Calendar;

public class ScheduleCreationService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog) : IScheduleCreationService
{
    public async Task<CalendarActionResult> CreateScheduleAsync(CreateSchedule dto)
    {
        if (currentUser.RequireAdmin<CalendarActionResult>("create a schedule") is { } refusal)
            return refusal;

        var validationError = await ScheduleValidation.ValidateAsync(
            context,
            dto.DoctorId,
            dto.StartHour,
            dto.EndHour,
            dto.SlotDurationMin,
            dto.WorkingDays);

        if (validationError is not null)
            return validationError;

        var dummyDate = new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var start = dummyDate.AddHours(dto.StartHour);
        var end = dummyDate.AddHours(dto.EndHour);

        // Unlike ChangeScheduleAsync, no overlap check: ValidateAsync has already
        // refused a doctor who has any schedule, so there is nothing to overlap.
        await using var transaction = await context.Database.BeginTransactionAsync();

        var calendar = new CalendarEntity
        {
            DoctorId = dto.DoctorId,
            StartTime = start,
            EndTime = end,
            SlotDurationMin = dto.SlotDurationMin,
            WorkingDays = ScheduleDays.Normalize(dto.WorkingDays ?? CalendarEntity.Weekdays)
        };
        context.Calendars.Add(calendar);
        await context.SaveChangesAsync();

        await auditLog.LogAsync("CreateSchedule", "Calendar", calendar.Id, $"Created schedule for doctor {dto.DoctorId}");
        await context.SaveChangesAsync();
        await transaction.CommitAsync();

        return CalendarActionResult.Success();
    }
}
