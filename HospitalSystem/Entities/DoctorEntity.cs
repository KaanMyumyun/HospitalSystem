public class DoctorEntity
{
    public int Id { get; set; }  
    public int DepartmentId { get; set; }
    public DepartmentEntity Department { get; set; }
    public int UserId { get; set; }
    public UserEntity User { get; set; }
    public ICollection<AppointmentsEntity> Appointments { get; set; } = new List<AppointmentsEntity>();

}