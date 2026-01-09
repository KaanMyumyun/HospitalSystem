//IMPORTANT

public class LoginResultDto
{
    public bool IsSuccess { get; set; }
    public UserRole? Role { get; set; }
    public string Error { get; set; }

     public static LoginResultDto Fail(string error)
    {
        return new LoginResultDto
        {
            IsSuccess = false,
            Error = error
        };
    }

    public static LoginResultDto Success(UserRole role)
    {
        return new LoginResultDto
        {
            IsSuccess = true,
            Role = role
        };
}
}