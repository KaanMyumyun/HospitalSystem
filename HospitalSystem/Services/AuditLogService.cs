using HospitalSystem.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services;

public class AuditLogService(ApplicationDbContext context, ICurrentUserService currentUser) : IAuditLogService
{
    public async Task LogAsync(
        string action, string entityType, int entityId, string details, CancellationToken cancellationToken = default)
    {
        int? actorId = int.TryParse(currentUser.UserId, out var userId) ? userId : null;
        var actorName = currentUser.UserName ?? (actorId is null
            ? null
            : await context.Users.Where(u => u.Id == actorId).Select(u => u.Name).FirstOrDefaultAsync(cancellationToken));

        context.AuditLogs.Add(new AuditLogEntity
        {
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            ActorUserId = actorId,
            ActorName = actorName ?? "Unknown",
            CreatedAt = DateTime.UtcNow
        });
    }
}
