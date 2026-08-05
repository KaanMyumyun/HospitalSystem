public class TestAuditLogService : IAuditLogService
{
    private readonly ApplicationDbContext _context;

    public TestAuditLogService(ApplicationDbContext context)
    {
        _context = context;
    }

    public Task LogAsync(string action, string entityType, int entityId, string details)
    {
        _context.AuditLogs.Add(new AuditLogEntity
        {
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            ActorName = "Test",
            CreatedAt = DateTime.UtcNow
        });

        return Task.CompletedTask;
    }
}
