namespace HospitalSystem.Dto;

public class ViewSchedule
{
    public int ScheduleId { get; set; }
    public int DoctorId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int SlotDurationMin { get; set; }
    public List<DayOfWeek> WorkingDays { get; set; } = [];

    public int? BreakStartMinute { get; set; }
    public int? BreakEndMinute { get; set; }

    public List<TimeOffDto> TimeOff { get; set; } = [];
}
