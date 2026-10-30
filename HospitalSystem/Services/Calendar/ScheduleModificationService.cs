using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Calendar;
using HospitalSystem.Services.Appointments;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Calendar;

public class ScheduleModificationService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog,
    ClinicClock clinic) : IScheduleModificationService
{
    public async Task<CalendarActionResult> ChangeScheduleAsync(
        ChangeScheduleDto dto, CancellationToken cancellationToken = default)
    {
        if (currentUser.RequireAdmin<CalendarActionResult>("change a schedule") is { } refusal)
            return refusal;

        var found = await context.Calendars
            .Where(c => c.Id == dto.ScheduleId)
            .Select(c => new
            {
                Calendar = c,
                Doctor = new ScheduleValidation.DoctorState(c.Doctor.IsActive, c.Doctor.Department.IsActive)
            })
            .FirstOrDefaultAsync(cancellationToken);
        if (found == null)
            return CalendarActionResult.NotFound("Schedule not found");

        var validationError = ScheduleValidation.Validate(
            found.Doctor,
            dto.StartHour,
            dto.EndHour,
            dto.SlotDurationMin,
            dto.WorkingDays,
            dto.BreakStartMinute,
            dto.BreakEndMinute);

        if (validationError is not null)
            return validationError;

        var calendar = found.Calendar;
        var workingDays = ScheduleDays.Normalize(dto.WorkingDays ?? calendar.WorkingDays);

        var newHours = new BookingRules.WorkingHours(
            CalendarEntity.HoursDate.AddHours(dto.StartHour),
            CalendarEntity.HoursDate.AddHours(dto.EndHour),
            dto.SlotDurationMin,
            workingDays,
            dto.BreakStartMinute,
            dto.BreakEndMinute);
        var future = await AffectedBookings.LoadFutureAsync(context, a => a.DoctorId == calendar.DoctorId, cancellationToken);
        var stranded = future
            .Where(a => BookingRules.CheckWorkingHours(newHours, clinic.WallClock(a.TimeOfAppointment)) is not null)
            .ToList();
        var bookingRefusal = await AffectedBookings.ResolveAsync<CalendarActionResult>(
            stranded, dto, auditLog, $"schedule change for doctor {calendar.DoctorId}", cancellationToken);
        if (bookingRefusal is not null)
            return bookingRefusal;

        calendar.SetHours(dto.StartHour, dto.EndHour);
        calendar.SlotDurationMin = dto.SlotDurationMin;
        calendar.WorkingDays = workingDays;
        calendar.BreakStartMinute = dto.BreakStartMinute;
        calendar.BreakEndMinute = dto.BreakEndMinute;
        await auditLog.LogAsync(
            "ChangeSchedule",
            "Calendar",
            calendar.Id,
            $"Updated schedule for doctor {calendar.DoctorId}",
            cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        return CalendarActionResult.Success();
    }
}
