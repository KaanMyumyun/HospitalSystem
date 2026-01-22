public class DepartmentActionResultDto
{
    public bool IsSuccess { get; set; }

    public string? Error { get; set; }
    public static DepartmentActionResultDto Fail(string error)
    {
        return new DepartmentActionResultDto
        {
            Error = error,
            IsSuccess = false
        };
    }

    public static DepartmentActionResultDto Success()
    {
        return new DepartmentActionResultDto
        {
            IsSuccess = true
        };
    }
}