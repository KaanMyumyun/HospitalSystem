namespace HospitalSystem.Entities;

public class CalendarEntity
{
    public int Id { get; set; }
    public int DoctorId { get; set; }
    public DoctorEntity Doctor { get; set; } = null!;
    public int SlotDurationMin { get; set; }

    // What a schedule works unless given other days, and what schedules made
    // before working days existed got: the days the reception grid showed.
    public static readonly IReadOnlyList<DayOfWeek> Weekdays =
        [DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday];

    // Monday first, without repeats (ScheduleDays.Normalize).
    public List<DayOfWeek> WorkingDays { get; set; } = [.. Weekdays];

    // A break every working day, in minutes after midnight, clinic time: 720
    // to 780 is 12:00 to 13:00. No booking may overlap it. Null for none.
    public int? BreakStartMinute { get; set; }
    public int? BreakEndMinute { get; set; }

    public ICollection<TimeOffEntity> TimeOff { get; set; } = new List<TimeOffEntity>();

    // Working hours are times of day, kept as times on this placeholder date;
    // an end hour of 24 is midnight starting the next day. Readers take the
    // time of day relative to StartTime's own date, so rows an older release
    // stored on another date still read the same.
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