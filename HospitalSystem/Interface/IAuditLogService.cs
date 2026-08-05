public interface IAuditLogService
{
    Task LogAsync(string action, string entityType, int entityId, string details);
}
