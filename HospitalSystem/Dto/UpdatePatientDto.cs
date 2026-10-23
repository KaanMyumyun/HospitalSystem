using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class UpdatePatientDto
{
    // From the route, never the body.
    [JsonIgnore]
    public int PatientId { get; set; }

    // Limits match the Patients columns.
    [Required]
    [MaxLength(50, ErrorMessage = "Patient name must be 50 characters or fewer")]
    public string Name { get; set; } = "";

    [Required]
    [MaxLength(20, ErrorMessage = "Phone number must be 20 characters or fewer")]
    public string PhoneNumber { get; set; } = "";

    [Required]
    public DateOnly? DateOfBirth { get; set; }
}
