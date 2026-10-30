namespace HospitalSystem.Entities;

public class AuditLogEntity
{
    public int Id { get; set; }
    public string Action { get; set; } = null!;
    public string EntityType { get; set; } = null!;
    public int EntityId { get; set; }
    public string Details { get; set; } = null!;

    public int? ActorUserId { get; set; }
    public string ActorName { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
