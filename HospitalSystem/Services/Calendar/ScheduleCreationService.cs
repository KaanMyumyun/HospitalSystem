using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Calendar;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HospitalSystem.Services.Calendar;

public class ScheduleCreationService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog) : IScheduleCreationService
{
    public async Task<CalendarActionResult> CreateScheduleAsync(CreateSchedule dto, CancellationToken cancellationToken = default)
    {
        if (currentUser.RequireAdmin<CalendarActionResult>("create a schedule") is { } refusal)
            return refusal;

        var validationError = await ScheduleValidation.ValidateAsync(
            context,
            dto.DoctorId,
            dto.StartHour,
            dto.EndHour,
            dto.SlotDurationMin,
            dto.WorkingDays,
            dto.BreakStartMinute,
            dto.BreakEndMinute,
            cancellationToken);

        if (validationError is not null)
            return validationError;

        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

        var calendar = new CalendarEntity
        {
            DoctorId = dto.DoctorId,
            SlotDurationMin = dto.SlotDurationMin,
            WorkingDays = ScheduleDays.Normalize(dto.WorkingDays ?? CalendarEntity.Weekdays),
            BreakStartMinute = dto.BreakStartMinute,
            BreakEndMinute = dto.BreakEndMinute
        };
        calendar.SetHours(dto.StartHour, dto.EndHour);
        context.Calendars.Add(calendar);

        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            context.Entry(calendar).State = EntityState.Detached;
            return CalendarActionResult.Conflict(ScheduleValidation.AlreadyScheduled);
        }

        await auditLog.LogAsync(
            "CreateSchedule",
            "Calendar",
            calendar.Id,
            $"Created schedule for doctor {dto.DoctorId}",
            cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return CalendarActionResult.Success();
    }
}
