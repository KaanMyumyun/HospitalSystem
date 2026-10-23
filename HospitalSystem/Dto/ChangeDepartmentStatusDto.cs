using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class ChangeDepartmentStatusDto : ICancelsAffectedBookings
{
    // From the route, never the body.
    [JsonIgnore]
    public int DepartmentId { get; set; }
    // Required, so a request that leaves it out cannot deactivate the
    // department by default.
    [Required]
    public bool? IsActive { get; set; }

    public bool CancelAffectedAppointments { get; set; }
    public string? CancellationReason { get; set; }
}
