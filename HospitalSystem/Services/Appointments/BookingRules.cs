namespace HospitalSystem.Services.Appointments;

internal static class BookingRules
{
    public sealed record WorkingHours(
        DateTime StartTime,
        DateTime EndTime,
        int SlotDurationMin,
        List<DayOfWeek> WorkingDays,
        int? BreakStartMinute,
        int? BreakEndMinute);

    public static string? CheckWorkingHours(WorkingHours schedule, DateTime wallClock)
    {
        if (!schedule.WorkingDays.Contains(wallClock.DayOfWeek))
            return $"The doctor does not work on {wallClock.DayOfWeek}s";

        var startMinutes = (schedule.StartTime - schedule.StartTime.Date).TotalMinutes;
        var endMinutes = (schedule.EndTime - schedule.StartTime.Date).TotalMinutes;
        var requestedMinutes = wallClock.TimeOfDay.TotalMinutes;

        if (requestedMinutes < startMinutes || requestedMinutes + schedule.SlotDurationMin > endMinutes)
            return "Appointment time is outside the doctor's working hours";

        var slot = TimeSpan.FromMinutes(schedule.SlotDurationMin);
        var intoSchedule = wallClock.TimeOfDay - TimeSpan.FromMinutes(startMinutes);
        if (slot <= TimeSpan.Zero || intoSchedule.Ticks % slot.Ticks != 0)
            return $"Appointment time must be the start of one of the doctor's {schedule.SlotDurationMin}-minute slots";

        if (schedule.BreakStartMinute is int breakStart && schedule.BreakEndMinute is int breakEnd
            && requestedMinutes < breakEnd && requestedMinutes + schedule.SlotDurationMin > breakStart)
            return $"Appointment time falls in the doctor's break, {Clock(breakStart)}-{Clock(breakEnd)}";

        return null;
    }

    public static bool Overlaps(DateTime appointmentTime, int slotDurationMin, DateTime? previousStart, DateTime? nextStart)
    {
        var slotLength = TimeSpan.FromMinutes(slotDurationMin);
        return previousStart > appointmentTime - slotLength || nextStart < appointmentTime + slotLength;
    }

    public static string Clock(int minutes) => $"{minutes / 60:00}:{minutes % 60:00}";
}
