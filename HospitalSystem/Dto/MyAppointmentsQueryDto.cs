using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Dto;

public class MyAppointmentsQueryDto
{
    [Required]
    public DateTimeOffset? From { get; set; }

    [Required]
    public DateTimeOffset? To { get; set; }
}
