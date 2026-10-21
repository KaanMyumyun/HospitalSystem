using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Dto;

public class ChangeDoctorStatusDto : ICancelsAffectedBookings
{
    [Required]
    public int? DoctorId { get; set; }

    [Required]
    public bool? IsActive { get; set; }

    public bool CancelAffectedAppointments { get; set; }
    public string? CancellationReason { get; set; }
}
