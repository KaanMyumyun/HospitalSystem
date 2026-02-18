using System.ComponentModel.DataAnnotations;
public class CreateAppointmentDto
{
    public int DoctorId { get; set; }
    
    [Required]
    public string PatientName { get; set; }
    
    [Required]
    [Phone]
    public string PhoneNumber { get; set; }
    
    [Required]
    public DateTime DateOfBirth { get; set; }
    
    [Required]
    public DateTime AppointmentTime { get; set; }
}
