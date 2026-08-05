using HospitalSystem.Interface;

namespace HospitalSystem.Services;

public class AuditLogService : IAuditLogService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public AuditLogService(ApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public Task LogAsync(string action, string entityType, int entityId, string details)
    {
        _context.AuditLogs.Add(new AuditLogEntity
        {
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            ActorName = _currentUser.UserId ?? "Unknown",
            CreatedAt = DateTime.UtcNow
        });

        return Task.CompletedTask;
    }
}
