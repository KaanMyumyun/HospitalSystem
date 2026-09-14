using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Dto;

public class CancelAppointmentDto
{
[Required]
public int AppointmentId { get; set; }
public AppointmentStatus Status { get; set; }
[MaxLength(500)]
public string Reason { get; set; }
}