namespace HospitalSystem.Entities;

public class CalendarEntity
{
    public int Id { get; set; }
    public int DoctorId { get; set; }
    public DoctorEntity Doctor { get; set; } = null!;
    public int SlotDurationMin { get; set; }

    public static readonly IReadOnlyList<DayOfWeek> Weekdays =
        [DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday];

    public List<DayOfWeek> WorkingDays { get; set; } = [.. Weekdays];

    public int? BreakStartMinute { get; set; }
    public int? BreakEndMinute { get; set; }

    public ICollection<TimeOffEntity> TimeOff { get; set; } = new List<TimeOffEntity>();

    public static readonly DateTime HoursDate = new(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public void SetHours(int startHour, int endHour)
    {
        StartTime = HoursDate.AddHours(startHour);
        EndTime = HoursDate.AddHours(endHour);
    }

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