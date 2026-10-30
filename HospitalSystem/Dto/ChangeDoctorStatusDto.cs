using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class ChangeDoctorStatusDto : ICancelsAffectedBookings
{
    [JsonIgnore]
    public int DoctorId { get; set; }

    [Required]
    public bool? IsActive { get; set; }

    public bool CancelAffectedAppointments { get; set; }
    public string? CancellationReason { get; set; }
}
