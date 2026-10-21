namespace HospitalSystem.Dto;

// A change request that, sent again after a reply listing affected bookings,
// cancels them with the given reason.
public interface ICancelsAffectedBookings
{
    bool CancelAffectedAppointments { get; }
    string? CancellationReason { get; }
}
