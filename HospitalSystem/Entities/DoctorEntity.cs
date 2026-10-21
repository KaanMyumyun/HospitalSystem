namespace HospitalSystem.Entities;

public class DoctorEntity
{
    public int Id { get; set; }  
    public int DepartmentId { get; set; }
    public DepartmentEntity Department { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public int UserId { get; set; }
    public UserEntity User { get; set; } = null!;
    public ICollection<CalendarEntity> Calendars { get; set; } = new List<CalendarEntity>();
    public ICollection<AppointmentsEntity> Appointments { get; set; } = new List<AppointmentsEntity>();

}