using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class ChangeAppointmentStatusDto
{
    // From the route, never the body.
    [JsonIgnore]
    public int AppointmentId { get; set; }

    // Completed or NoShow.
    [Required]
    public AppointmentStatus? Status { get; set; }
}
