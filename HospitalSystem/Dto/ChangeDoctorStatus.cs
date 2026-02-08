public class ChangeDoctorsStatus
{
    public int DoctorId { get; set; }
    public bool IsActive { get; set; }
    public int UserId { get; set; }
    public string ?UserName { get; set; }
}