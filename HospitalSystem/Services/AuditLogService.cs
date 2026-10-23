using HospitalSystem.Interfaces;

namespace HospitalSystem.Services;

public class AuditLogService(ApplicationDbContext context, ICurrentUserService currentUser) : IAuditLogService
{
    public Task LogAsync(string action, string entityType, int entityId, string details)
    {
        context.AuditLogs.Add(new AuditLogEntity
        {
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            ActorName = currentUser.UserId ?? "Unknown",
            CreatedAt = DateTime.UtcNow
        });

        return Task.CompletedTask;
    }
}
