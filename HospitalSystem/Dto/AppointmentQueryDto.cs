using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Dto;

public class AppointmentQueryDto
{
    [Required]
    public int? DoctorId { get; set; }

    [Required]
    public DateTimeOffset? From { get; set; }

    [Required]
    public DateTimeOffset? To { get; set; }
}
