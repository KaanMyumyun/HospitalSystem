namespace HospitalSystem.Dto;

public abstract class BookingChangeResult<TSelf> : OperationResult<TSelf>
    where TSelf : BookingChangeResult<TSelf>, new()
{
    public int AffectedAppointmentCount { get; set; }
    public List<AffectedAppointmentDto>? AffectedAppointments { get; set; }

    public static TSelf AffectsBookings(int count, List<AffectedAppointmentDto> soonest) => new()
    {
        Error = count == 1
            ? "This change affects 1 future booking. Cancel it with a reason, or move it first."
            : $"This change affects {count} future bookings. Cancel them with a reason, or move them first.",
        Failure = FailureKind.Conflict,
        AffectedAppointmentCount = count,
        AffectedAppointments = soonest
    };
}
