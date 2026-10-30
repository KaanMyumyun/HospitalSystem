using HospitalSystem.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services;

public class AuditLogQueryService(
    ApplicationDbContext context,
    ICurrentUserService currentUser) : IAuditLogQueryService
{
    public async Task<ServiceResult<PagedResult<AuditLogEntryDto>>> ListAsync(
        AuditLogQueryDto query, CancellationToken cancellationToken = default)
    {
        if (!currentUser.IsAdmin())
            return ServiceResult<PagedResult<AuditLogEntryDto>>.Forbidden("Not allowed to read the audit log");

        if (query.Page < 1 || query.Page > AuditLogQueryDto.MaxPage)
            return ServiceResult<PagedResult<AuditLogEntryDto>>.Fail($"Page must be between 1 and {AuditLogQueryDto.MaxPage}");

        if (query.PageSize < 1 || query.PageSize > AuditLogQueryDto.MaxPageSize)
            return ServiceResult<PagedResult<AuditLogEntryDto>>.Fail($"Page size must be between 1 and {AuditLogQueryDto.MaxPageSize}");

        var entries = context.AuditLogs.AsQueryable();
        var search = query.Search?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(search))
            entries = entries.Where(a => a.Action.ToLower().Contains(search) || a.Details.ToLower().Contains(search));

        var rows = await entries
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(a => new
            {
                Item = new AuditLogEntryDto
                {
                    Id = a.Id,
                    CreatedAt = a.CreatedAt,
                    Action = a.Action,
                    EntityType = a.EntityType,
                    EntityId = a.EntityId,
                    Details = a.Details,
                    Actor = a.ActorUserId != null
                        ? a.ActorName
                        : context.Users
                            .Where(u => u.Id.ToString() == a.ActorName)
                            .Select(u => u.Name)
                            .FirstOrDefault() ?? a.ActorName
                },
                TotalCount = entries.Count()
            })
            .ToListAsync(cancellationToken);

        var totalCount = rows.Count > 0 ? rows[0].TotalCount
            : query.Page == 1 ? 0
            : await entries.CountAsync(cancellationToken);

        return ServiceResult<PagedResult<AuditLogEntryDto>>.Success(new PagedResult<AuditLogEntryDto>
        {
            Items = rows.Select(r => r.Item).ToList(),
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize
        });
    }
}
