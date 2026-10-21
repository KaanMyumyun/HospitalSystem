namespace HospitalSystem.Dto;

public class CreateSchedule
{
    public int DoctorId { get; set; }
    public int StartHour { get; set; }
    public int EndHour { get; set; }
    public int SlotDurationMin { get; set; }

    // Null means Monday to Friday.
    public List<DayOfWeek>? WorkingDays { get; set; }
}
