using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class MoveAppointmentDto
{
    // From the route, never the body.
    [JsonIgnore]
    public int AppointmentId { get; set; }

    // The doctor to move it to; null keeps the same doctor.
    public int? DoctorId { get; set; }

    // The new time, as for a booking: read as a clinic time whatever its offset.
    [Required]
    public DateTimeOffset? AppointmentTime { get; set; }
}
