namespace HospitalSystem.Dto;

public class ChangeDepartmentStatusDto : ICancelsAffectedBookings
{
    public int DepartmentId { get; set; }
    public bool IsActive { get; set; }

    public bool CancelAffectedAppointments { get; set; }
    public string? CancellationReason { get; set; }
}
