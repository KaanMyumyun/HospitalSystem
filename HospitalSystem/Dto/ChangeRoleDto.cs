namespace HospitalSystem.Dto;

public class ChangeRoleDto : ICancelsAffectedBookings
{
    public int UserId { get; set; }
    public UserRole NewRole { get; set; }

    // Taking the Doctor role away deactivates the doctor, which strands their
    // future bookings.
    public bool CancelAffectedAppointments { get; set; }
    public string? CancellationReason { get; set; }
}
