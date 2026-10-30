namespace HospitalSystem.Dto;

public class CreateSchedule
{
    public int DoctorId { get; set; }
    public int StartHour { get; set; }
    public int EndHour { get; set; }
    public int SlotDurationMin { get; set; }

    public List<DayOfWeek>? WorkingDays { get; set; }

    public int? BreakStartMinute { get; set; }
    public int? BreakEndMinute { get; set; }
}
