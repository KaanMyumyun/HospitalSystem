using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class MoveAppointmentDto
{
    [JsonIgnore]
    public int AppointmentId { get; set; }

    public int? DoctorId { get; set; }

    [Required]
    public DateTimeOffset? AppointmentTime { get; set; }
}
