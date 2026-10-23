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