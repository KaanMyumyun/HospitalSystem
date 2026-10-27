namespace HospitalSystem.Services.Appointments;

// When a doctor can be booked, for booking an appointment and for moving one.
// Times are the clinic's wall clock (ClinicClock).
internal static class BookingRules
{
    // What a booking needs to know about the doctor's schedule.
    public sealed record WorkingHours(
        DateTime StartTime,
        DateTime EndTime,
        int SlotDurationMin,
        List<DayOfWeek> WorkingDays,
        int? BreakStartMinute,
        int? BreakEndMinute);

    // Null when the doctor works at that clinic time; otherwise why not.
    public static string? CheckWorkingHours(WorkingHours schedule, DateTime wallClock)
    {
        if (!schedule.WorkingDays.Contains(wallClock.DayOfWeek))
            return $"The doctor does not work on {wallClock.DayOfWeek}s";

        // Stored on a placeholder date; an end hour of 24 is midnight of the next day.
        var startMinutes = (schedule.StartTime - schedule.StartTime.Date).TotalMinutes;
        var endMinutes = (schedule.EndTime - schedule.StartTime.Date).TotalMinutes;
        var requestedMinutes = wallClock.TimeOfDay.TotalMinutes;

        if (requestedMinutes < startMinutes || requestedMinutes + schedule.SlotDurationMin > endMinutes)
            return "Appointment time is outside the doctor's working hours";

        // A booking starts on one of the doctor's slots, on the minute, so two
        // bookings for one slot have the same time and the unique index on
        // doctor and time refuses the second even when they race.
        var slot = TimeSpan.FromMinutes(schedule.SlotDurationMin);
        var intoSchedule = wallClock.TimeOfDay - TimeSpan.FromMinutes(startMinutes);
        if (slot <= TimeSpan.Zero || intoSchedule.Ticks % slot.Ticks != 0)
            return $"Appointment time must be the start of one of the doctor's {schedule.SlotDurationMin}-minute slots";

        if (schedule.BreakStartMinute is int breakStart && schedule.BreakEndMinute is int breakEnd
            && requestedMinutes < breakEnd && requestedMinutes + schedule.SlotDurationMin > breakStart)
            return $"Appointment time falls in the doctor's break, {Clock(breakStart)}-{Clock(breakEnd)}";

        return null;
    }

    // Every booking lasts one slot, so another scheduled booking overlaps one
    // at appointmentTime when it starts less than a slot before or after it.
    public static bool Overlaps(DateTime appointmentTime, int slotDurationMin, DateTime? previousStart, DateTime? nextStart)
    {
        var slotLength = TimeSpan.FromMinutes(slotDurationMin);
        return previousStart > appointmentTime - slotLength || nextStart < appointmentTime + slotLength;
    }

    // 750 is "12:30".
    public static string Clock(int minutes) => $"{minutes / 60:00}:{minutes % 60:00}";
}
