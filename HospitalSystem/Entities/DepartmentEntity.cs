public class DepartmentEntity
{
    public int Id { get; set; }
    public string Department { get; set; }
    public bool IsActive { get; set; }
    public ICollection<DoctorEntity> Doctors { get; set; } = new List<DoctorEntity>();
}