using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Dto;

public class CancelAppointmentDto
{
[Required]
public int? AppointmentId { get; set; }
[MaxLength(500)]
public string Reason { get; set; }
}