namespace HospitalSystem.Dto;

public class AppointmentHistoryEntryDto
{
    public DateTime CreatedAt { get; set; }
    public string Action { get; set; } = "";
    public string Details { get; set; } = "";
    // The username of whoever did it.
    public string Actor { get; set; } = "";
}
