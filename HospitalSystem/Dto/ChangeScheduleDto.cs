using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class ChangeScheduleDto : ICancelsAffectedBookings
{
    [JsonIgnore]
    public int ScheduleId { get; set; }
    public int StartHour { get; set; }
    public int EndHour { get; set; }
    public int SlotDurationMin { get; set; }

    public List<DayOfWeek>? WorkingDays { get; set; }

    public int? BreakStartMinute { get; set; }
    public int? BreakEndMinute { get; set; }

    public bool CancelAffectedAppointments { get; set; }
    public string? CancellationReason { get; set; }
}
