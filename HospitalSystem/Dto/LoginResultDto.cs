public class LoginResultDto
{
    public bool IsSuccess { get; set; }
    public UserRole? Role { get; set; }
    public string Error { get; set; }
}