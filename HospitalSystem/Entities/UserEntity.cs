using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Entities;

public class UserEntity
{
    public int Id { get; set; }
    [Required]
    public string Name { get; set; }
    [Required]
    public string PasswordHash { get; set; }
    public UserRole Role { get; set; }

    [Required]
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString();
    public DoctorEntity Doctor { get; set; }
    public ICollection<AppointmentsEntity> CreatedAppointments { get; set; } = new List<AppointmentsEntity>();

}
