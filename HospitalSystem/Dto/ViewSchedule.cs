namespace HospitalSystem.Dto;

public class ViewSchedule
{
    public int ScheduleId { get; set; }
    public int DoctorId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int SlotDurationMin { get; set; }
    public List<DayOfWeek> WorkingDays { get; set; } = [];

    // In minutes after midnight, clinic time; null for no break.
    public int? BreakStartMinute { get; set; }
    public int? BreakEndMinute { get; set; }

    // Time off that has not ended yet, soonest first.
    public List<TimeOffDto> TimeOff { get; set; } = [];
}
