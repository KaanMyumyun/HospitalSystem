using System.ComponentModel.DataAnnotations;

public class CreateAppointmentDto
{
    public int DoctorId{ get; set; }
    public int PatientId { get; set; }
    [Required]
    public DateTime AppointmentTime { get; set; }

}
