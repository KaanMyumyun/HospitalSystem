using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Dto;

public class CreateAppointmentDto
{
    public int DoctorId { get; set; }

    [Required]
    [MaxLength(50, ErrorMessage = "Patient name must be 50 characters or fewer")]
    public string PatientName { get; set; } = "";

    [Required]
    [Phone]
    [MaxLength(20, ErrorMessage = "Phone number must be 20 characters or fewer")]
    public string PhoneNumber { get; set; } = "";

    [Required]
    public DateOnly? DateOfBirth { get; set; }

    [Required]
    public DateTimeOffset? AppointmentTime { get; set; }

    public int? PatientId { get; set; }

    public bool CreateNewPatient { get; set; }
}
