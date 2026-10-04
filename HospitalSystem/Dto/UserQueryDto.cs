using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Dto;

public class UserQueryDto
{
    public const int MaxPage = 100_000;
    public const int MaxPageSize = 100;

    // Part of a username or a role name, in any case.
    [MaxLength(50)]
    public string? Search { get; set; }

    [Range(1, MaxPage)]
    public int Page { get; set; } = 1;

    [Range(1, MaxPageSize)]
    public int PageSize { get; set; } = 50;
}
