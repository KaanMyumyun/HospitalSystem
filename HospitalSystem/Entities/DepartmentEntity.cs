namespace HospitalSystem.Entities;

public class DepartmentEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public bool IsActive { get; set; }
    public ICollection<DoctorEntity> Doctors { get; set; } = new List<DoctorEntity>();
}