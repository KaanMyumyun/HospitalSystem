public class ChangeRoleResultDto
{
    public bool IsSuccess { get; set; }
  
    public string? Error { get; set; }
       public static ChangeRoleResultDto Fail(string error)
    {
        return new ChangeRoleResultDto
        {
        Error = error,
        IsSuccess = false
        };
    }

    public static ChangeRoleResultDto Success()
    {
        return new ChangeRoleResultDto
        {
            IsSuccess = true
        };
    }
}