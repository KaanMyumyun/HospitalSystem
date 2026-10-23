using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Entities;

public class AppointmentEntity
{
    public int Id { get; set; }
    public AppointmentStatus Status { get; set; }
    [MaxLength(500)]
    public string? CancellationReason { get; set; }
    public DateTime? CancelledAt { get; set; }
    public DateTime TimeOfAppointment { get; set; }
    public DateTime CreatedAt { get; set; }

    public int CreatedByTheFrontDeskId { get; set; }
    public UserEntity CreatedByTheFrontDesk { get; set; } = null!;

    public int PatientId { get; set; }
    public PatientEntity Patient { get; set; } = null!;

    public int DoctorId { get; set; }
    public DoctorEntity Doctor { get; set; } = null!;

}
