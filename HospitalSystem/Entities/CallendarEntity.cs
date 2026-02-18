public class CalendarEntity
{
    public int Id { get; set; }
    public int DoctorId { get; set; }
    public DoctorEntity Doctor { get; set; }
    public int SlotDurationMin { get; set; }
    private DateTime _startTime;
    public DateTime StartTime
    {
        get => _startTime;
        set => _startTime = DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }

    private DateTime _endTime;
    public DateTime EndTime
    {
        get => _endTime;
        set => _endTime = DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }
}