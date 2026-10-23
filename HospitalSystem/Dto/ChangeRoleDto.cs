using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class ChangeRoleDto : ICancelsAffectedBookings
{
    // From the route, never the body.
    [JsonIgnore]
    public int UserId { get; set; }
    public UserRole NewRole { get; set; }
    // Where a user who has never been a doctor works. A former doctor goes
    // back to their old department unless this names another.
    public int? DepartmentId { get; set; }

    // Taking the Doctor role away deactivates the doctor, which strands their
    // future bookings.
    public bool CancelAffectedAppointments { get; set; }
    public string? CancellationReason { get; set; }
}
