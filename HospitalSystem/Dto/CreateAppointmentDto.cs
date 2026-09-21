using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Dto;

public class CreateAppointmentDto
{
    public int DoctorId { get; set; }
    
    // Limits match the Patients columns.
    [Required]
    [MaxLength(50, ErrorMessage = "Patient name must be 50 characters or fewer")]
    public string PatientName { get; set; }
    
    [Required]
    [Phone]
    [MaxLength(20, ErrorMessage = "Phone number must be 20 characters or fewer")]
    public string PhoneNumber { get; set; }
    
    [Required]
    public DateOnly? DateOfBirth { get; set; }
    
    // The desk's wall-clock time with its UTC offset, e.g. 2026-09-22T09:00:00+03:00.
    [Required]
    public DateTimeOffset? AppointmentTime { get; set; }
}
