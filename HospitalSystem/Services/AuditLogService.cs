using HospitalSystem.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services;

// Adds an entry without saving it: the caller's save writes it together with
// the change it describes, so a failed change leaves no entry behind.
public class AuditLogService(ApplicationDbContext context, ICurrentUserService currentUser) : IAuditLogService
{
    public async Task LogAsync(
        string action, string entityType, int entityId, string details, CancellationToken cancellationToken = default)
    {
        int? actorId = int.TryParse(currentUser.UserId, out var userId) ? userId : null;
        // The token carries the username; one issued before it did needs a lookup.
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
