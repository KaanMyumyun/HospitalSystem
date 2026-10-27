namespace HospitalSystem.Entities;

// Days a doctor is away, such as a holiday. Nobody can book them then.
public class TimeOffEntity
{
    public int Id { get; set; }
    public int CalendarId { get; set; }
    public CalendarEntity Calendar { get; set; } = null!;

    // The first and the last day away, clinic dates, both included.
    public DateOnly FirstDay { get; set; }
    public DateOnly LastDay { get; set; }

    public string? Reason { get; set; }
}
