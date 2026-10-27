using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Dto;

// One doctor's appointments that start at or after From and before To.
public class AppointmentQueryDto
{
    [Required]
    public int? DoctorId { get; set; }

    // Instants with their UTC offset; the frontend sends the clinic's midnight,
    // e.g. 2026-09-21T00:00:00+03:00.
    [Required]
    public DateTimeOffset? From { get; set; }

    [Required]
    public DateTimeOffset? To { get; set; }
}
