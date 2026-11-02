namespace HospitalSystem.Dto;

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public bool HasNextPage { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
