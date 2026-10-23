using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class ChangeDoctorDepartmentDto
{
    // From the route, never the body.
    [JsonIgnore]
    public int DoctorId { get; set; }
    public int DepartmentId { get; set; }
}