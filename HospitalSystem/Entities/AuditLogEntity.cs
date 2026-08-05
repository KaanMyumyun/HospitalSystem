public class AuditLogEntity
{
    public int Id { get; set; }
    public string Action { get; set; }
    public string EntityType { get; set; }
    public int EntityId { get; set; }
    public string Details { get; set; }
    public string ActorName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
