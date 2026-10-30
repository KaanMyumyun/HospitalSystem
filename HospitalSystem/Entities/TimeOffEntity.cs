namespace HospitalSystem.Entities;

public class TimeOffEntity
{
    public int Id { get; set; }
    public int CalendarId { get; set; }
    public CalendarEntity Calendar { get; set; } = null!;

    public DateOnly FirstDay { get; set; }
    public DateOnly LastDay { get; set; }

    public string? Reason { get; set; }
}
