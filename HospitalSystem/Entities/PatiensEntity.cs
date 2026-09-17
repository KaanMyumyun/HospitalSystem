namespace HospitalSystem.Entities;

public class PatientEntity
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string PhoneNumber { get; set; }
    public DateOnly DateOfBirth { get; set; }
    public ICollection<AppointmentsEntity> Appointments { get; set; } = new List<AppointmentsEntity>();

}
