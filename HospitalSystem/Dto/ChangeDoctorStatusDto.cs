using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Dto;

public class ChangeDoctorStatusDto
{
    [Required]
    public int? DoctorId { get; set; }

    [Required]
    public bool? IsActive { get; set; }
}
