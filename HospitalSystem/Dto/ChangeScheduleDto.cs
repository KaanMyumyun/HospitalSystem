namespace HospitalSystem.Dto;

public class ChangeScheduleDto : ICancelsAffectedBookings
{
    public int ScheduleId { get; set; }
    public int StartHour { get; set; }
    public int EndHour { get; set; }
    public int SlotDurationMin { get; set; }

    // Null keeps the schedule's working days.
    public List<DayOfWeek>? WorkingDays { get; set; }

    // The admin's IANA time zone, such as Europe/Sofia. Future bookings are
    // checked against the new hours as wall-clock times in it.
    public string? TimeZone { get; set; }

    public bool CancelAffectedAppointments { get; set; }
    public string? CancellationReason { get; set; }
}
