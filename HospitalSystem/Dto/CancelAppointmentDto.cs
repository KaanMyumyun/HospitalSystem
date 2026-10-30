using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class CancelAppointmentDto
{
    [JsonIgnore]
    public int AppointmentId { get; set; }
    [MaxLength(500)]
    public string Reason { get; set; } = "";
}
