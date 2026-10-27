using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class AddTimeOffDto : ICancelsAffectedBookings
{
    // From the route, never the body.
    [JsonIgnore]
    public int ScheduleId { get; set; }

    // The first and the last day away, clinic dates, both included.
    [Required]
    public DateOnly? FirstDay { get; set; }
    [Required]
    public DateOnly? LastDay { get; set; }

    // The limit matches the TimeOff column.
    [MaxLength(200, ErrorMessage = "The reason must be 200 characters or fewer")]
    public string? Reason { get; set; }

    public bool CancelAffectedAppointments { get; set; }
    public string? CancellationReason { get; set; }
}
