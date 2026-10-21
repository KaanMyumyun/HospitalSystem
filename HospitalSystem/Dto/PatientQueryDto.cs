using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Dto;

public class PatientQueryDto
{
    public const int MaxPage = 100_000;
    public const int MaxPageSize = 100;

    // Part of a name in any case, or at least three digits of a phone number.
    [MaxLength(50)]
    public string? Search { get; set; }

    [Range(1, MaxPage)]
    public int Page { get; set; } = 1;

    [Range(1, MaxPageSize)]
    public int PageSize { get; set; } = 50;
}
