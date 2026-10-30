namespace HospitalSystem.Dto;

public class AuditLogEntryDto
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Action { get; set; } = "";
    public string EntityType { get; set; } = "";
    public int EntityId { get; set; }
    public string Details { get; set; } = "";

    public string Actor { get; set; } = "";
}
