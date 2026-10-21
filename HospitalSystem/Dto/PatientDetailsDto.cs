namespace HospitalSystem.Dto;

// A patient and their appointments, newest first.
public class PatientDetailsDto
{
    public int PatientId { get; set; }
    public string Name { get; set; } = "";
    public DateOnly DateOfBirth { get; set; }
    public string PhoneNumber { get; set; } = "";
    public List<PatientAppointmentDto> Appointments { get; set; } = [];
}

public class PatientAppointmentDto
{
    public int AppointmentId { get; set; }
    public DateTime AppointmentTime { get; set; }
    public int DoctorId { get; set; }
    public string DoctorName { get; set; } = "";
    public AppointmentStatus Status { get; set; }
    public string? CancellationReason { get; set; }
}
