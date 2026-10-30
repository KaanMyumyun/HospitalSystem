namespace HospitalSystem.Dto;

public class AffectedAppointmentDto
{
    public int AppointmentId { get; set; }
    public DateTime AppointmentTime { get; set; }
    public string DoctorName { get; set; } = "";
    public string PatientInitials { get; set; } = "";
}
