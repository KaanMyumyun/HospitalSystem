namespace HospitalSystem.Dto;

public class TimeOffDto
{
    public int TimeOffId { get; set; }
    // Clinic dates, both included.
    public DateOnly FirstDay { get; set; }
    public DateOnly LastDay { get; set; }
    public string? Reason { get; set; }
}
