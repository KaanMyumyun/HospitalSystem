using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services;

internal static class Paging
{
    public static async Task<PagedResult<T>> ToPageAsync<T>(
        this IQueryable<T> ordered, int page, int pageSize, CancellationToken cancellationToken)
    {
        var items = await ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize + 1)
            .ToListAsync(cancellationToken);

        var hasNextPage = items.Count > pageSize;
        if (hasNextPage)
            items.RemoveAt(pageSize);

        return new PagedResult<T>
        {
            Items = items,
            HasNextPage = hasNextPage,
            Page = page,
            PageSize = pageSize
        };
    }
}
