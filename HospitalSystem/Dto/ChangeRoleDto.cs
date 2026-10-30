using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class ChangeRoleDto : ICancelsAffectedBookings
{
    [JsonIgnore]
    public int UserId { get; set; }
    public UserRole NewRole { get; set; }
    public int? DepartmentId { get; set; }

    public bool CancelAffectedAppointments { get; set; }
    public string? CancellationReason { get; set; }
}
