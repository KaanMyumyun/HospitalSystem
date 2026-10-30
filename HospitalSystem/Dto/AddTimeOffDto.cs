using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class AddTimeOffDto : ICancelsAffectedBookings
{
    [JsonIgnore]
    public int ScheduleId { get; set; }

    [Required]
    public DateOnly? FirstDay { get; set; }
    [Required]
    public DateOnly? LastDay { get; set; }

    [MaxLength(200, ErrorMessage = "The reason must be 200 characters or fewer")]
    public string? Reason { get; set; }

    public bool CancelAffectedAppointments { get; set; }
    public string? CancellationReason { get; set; }
}
