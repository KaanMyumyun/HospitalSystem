namespace HospitalSystem.Interfaces;

public interface IAuditLogQueryService
{
    Task<ServiceResult<PagedResult<AuditLogEntryDto>>> ListAsync(AuditLogQueryDto query);
}
