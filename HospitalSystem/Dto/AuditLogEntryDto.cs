namespace HospitalSystem.Dto;

public class AuditLogEntryDto
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Action { get; set; } = "";
    public string EntityType { get; set; } = "";
    public int EntityId { get; set; }
    public string Details { get; set; } = "";

    // The username of whoever made the change, or "Unknown" when nobody was
    // signed in, as for a failed sign-in.
    public string Actor { get; set; } = "";
}
