using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class CancelAppointmentDto
{
    // From the route, never the body.
    [JsonIgnore]
    public int AppointmentId { get; set; }
    [MaxLength(500)]
    public string Reason { get; set; } = "";
}
