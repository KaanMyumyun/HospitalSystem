namespace HospitalSystem.Dto;

public class CreateSchedule
{
    public int DoctorId { get; set; }
    public int StartHour { get; set; }
    public int EndHour { get; set; }
    public int SlotDurationMin { get; set; }

    // Null means Monday to Friday.
    public List<DayOfWeek>? WorkingDays { get; set; }

    // A break every working day, in minutes after midnight: 720 to 780 is
    // 12:00 to 13:00. Both or neither.
    public int? BreakStartMinute { get; set; }
    public int? BreakEndMinute { get; set; }
}
