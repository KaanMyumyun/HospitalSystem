using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Entities;

public class UserEntity
{
    public int Id { get; set; }
    [Required]
    public string Name { get; set; } = null!;
    [Required]
    public string PasswordHash { get; set; } = null!;
    public UserRole Role { get; set; }

    [Required]
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString();

    public int FailedSignInCount { get; set; }
    public DateTime? LockedUntil { get; set; }

    public DoctorEntity? Doctor { get; set; }
    public ICollection<AppointmentEntity> CreatedAppointments { get; set; } = new List<AppointmentEntity>();

}
