namespace HospitalSystem.Dto;

// A patient on file who shares some of a booking's patient details.
public class PatientMatchDto
{
    public int PatientId { get; set; }
    public string Name { get; set; } = "";
    public DateOnly DateOfBirth { get; set; }
    public string PhoneNumber { get; set; } = "";
}
