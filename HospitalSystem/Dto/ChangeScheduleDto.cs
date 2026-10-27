using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class ChangeScheduleDto : ICancelsAffectedBookings
{
    // From the route, never the body.
    [JsonIgnore]
    public int ScheduleId { get; set; }
    public int StartHour { get; set; }
    public int EndHour { get; set; }
    public int SlotDurationMin { get; set; }

    // Null keeps the schedule's working days.
    public List<DayOfWeek>? WorkingDays { get; set; }

    // The new break, in minutes after midnight; neither means no break.
    public int? BreakStartMinute { get; set; }
    public int? BreakEndMinute { get; set; }

    public bool CancelAffectedAppointments { get; set; }
    public string? CancellationReason { get; set; }
}
