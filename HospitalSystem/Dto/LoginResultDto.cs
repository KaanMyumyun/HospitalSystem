public class LoginResultDto
{
    public bool IsSuccess { get; set; }
    public string Token { get; set; }
    public string Role { get; set; }
    public string Error { get; set; }

    public static LoginResultDto Fail(string error)
    {
        return new LoginResultDto
        {
            IsSuccess = false,
            Error = error
        };
    }

    public static LoginResultDto Success(string token, string role)
    {
        return new LoginResultDto
        {
            IsSuccess = true,
            Token = token,
            Role = role
        };
    }
}
