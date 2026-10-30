namespace HospitalSystem.Dto;

public interface ICancelsAffectedBookings
{
    bool CancelAffectedAppointments { get; }
    string? CancellationReason { get; }
}
