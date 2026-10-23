namespace HospitalSystem.Entities;

public class PatientEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string PhoneNumber { get; set; } = null!;
    public DateOnly DateOfBirth { get; set; }
    public ICollection<AppointmentEntity> Appointments { get; set; } = new List<AppointmentEntity>();

}
