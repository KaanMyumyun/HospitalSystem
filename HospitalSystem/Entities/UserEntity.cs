using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authentication.Cookies;

public class UserEntity
{
    public int Id { get; set; }


    [Required]
    public string Name { get; set; }
    [Required]
    public string PasswordHash { get; set; }
    public UserRole Role { get; set; }
    public DoctorEntity Doctor { get; set; }  
    public ICollection<AppointmentsEntity> CreatedAppointments { get; set; } = new List<AppointmentsEntity>();

}