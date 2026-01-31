public class ResetPasswordResultDto
{
    public bool IsSuccess { get; set; }  
    public string? Error { get; set; }
          public static ResetPasswordResultDto Fail(string error)
    {
        return new ResetPasswordResultDto
        {
        Error = error,
        IsSuccess = false
        };
    }

    public static ResetPasswordResultDto Success()
    {
        return new ResetPasswordResultDto
        {
            IsSuccess = true
        };
}
}