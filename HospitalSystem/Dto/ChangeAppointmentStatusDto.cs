using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Dto;

public class ChangeAppointmentStatusDto
{
    [Required]
    public int? AppointmentId { get; set; }

    // Completed or NoShow.
    [Required]
    public AppointmentStatus? Status { get; set; }
}
