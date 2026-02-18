public class ViewSchedule
{
    public int ScheduleId { get; set; }
    public int DoctorId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int SlotDurationMin { get; set; }

}