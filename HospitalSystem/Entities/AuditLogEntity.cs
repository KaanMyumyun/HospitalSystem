namespace HospitalSystem.Entities;

public class AuditLogEntity
{
    public int Id { get; set; }
    public string Action { get; set; } = null!;
    public string EntityType { get; set; } = null!;
    public int EntityId { get; set; }
    public string Details { get; set; } = null!;

    // Who made the change: their user id, and their username at the time.
    // Nobody was signed in for some entries, such as a failed sign-in: they
    // have no id, and the name "Unknown". Entries written before the id was
    // kept hold the id in ActorName instead.
    public int? ActorUserId { get; set; }
    public string ActorName { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
