public class CreateUserResultDto
{

    public bool IsSuccess { get; set; }
    public string Error { get; set; }
    public static CreateUserResultDto Fail(string error)
    {
        return new CreateUserResultDto
        {
            Error = error,
            IsSuccess = false
        };
    }

    public static CreateUserResultDto Success()
    {
        return new CreateUserResultDto
        {
            IsSuccess = true
        };
    }
}