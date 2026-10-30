using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class ChangeDoctorDepartmentDto
{
    [JsonIgnore]
    public int DoctorId { get; set; }
    public int DepartmentId { get; set; }
}