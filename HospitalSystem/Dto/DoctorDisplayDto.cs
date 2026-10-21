namespace HospitalSystem.Dto;

public class DoctorDisplayDto
{
    public int DoctorId { get; set; }
    public int DepartmentId { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = "";
    public bool IsActive { get; set; }
}