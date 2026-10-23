using HospitalSystem.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services;

// The audit log for admins, newest first. Entries name users, so demo admins
// cannot read it.
public class AuditLogQueryService(
    ApplicationDbContext context,
    ICurrentUserService currentUser) : IAuditLogQueryService
{
    public async Task<ServiceResult<PagedResult<AuditLogEntryDto>>> ListAsync(AuditLogQueryDto query)
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
                    // ActorName holds the acting user's id, or "Unknown".
                    Actor = context.Users
                        .Where(u => u.Id.ToString() == a.ActorName)
                        .Select(u => u.Name)
                        .FirstOrDefault() ?? a.ActorName
                },
                // Counted by the same statement, so a page and its total cost
                // one round trip.
                TotalCount = entries.Count()
            })
            .ToListAsync();

        // An empty page carries no total. On page 1 there is nothing to
        // count; a later page is past the last match and needs its own count.
        var totalCount = rows.Count > 0 ? rows[0].TotalCount
            : query.Page == 1 ? 0
            : await entries.CountAsync();

        return ServiceResult<PagedResult<AuditLogEntryDto>>.Success(new PagedResult<AuditLogEntryDto>
        {
            Items = rows.Select(r => r.Item).ToList(),
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize
        });
    }
}
