namespace HospitalSystem.Dto;

public class PatientSummaryDto
{
    public int PatientId { get; set; }
    public string Name { get; set; } = "";
    public DateOnly DateOfBirth { get; set; }
    public string PhoneNumber { get; set; } = "";
}
