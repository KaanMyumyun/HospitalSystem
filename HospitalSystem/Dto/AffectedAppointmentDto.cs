namespace HospitalSystem.Dto;

// A future booking that a schedule, status or role change would strand. The
// patient is shown by initials only: the admin needs the scale and the times,
// and the desk, which sees the cancellations, contacts the patients.
public class AffectedAppointmentDto
{
    public int AppointmentId { get; set; }
    public DateTime AppointmentTime { get; set; }
    public string DoctorName { get; set; } = "";
    public string PatientInitials { get; set; } = "";
}
