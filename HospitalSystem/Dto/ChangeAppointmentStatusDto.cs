using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class ChangeAppointmentStatusDto
{
    [JsonIgnore]
    public int AppointmentId { get; set; }

    [Required]
    public AppointmentStatus? Status { get; set; }
}
