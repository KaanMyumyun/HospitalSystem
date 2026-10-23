using HospitalSystem.Interfaces;

namespace HospitalSystem.Tests;

public class TestAuditLogService(ApplicationDbContext context) : IAuditLogService
{
    public Task LogAsync(string action, string entityType, int entityId, string details)
    {
        context.AuditLogs.Add(new AuditLogEntity
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
