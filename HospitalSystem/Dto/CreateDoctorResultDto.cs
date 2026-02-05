public class CreateDoctorResultDto
{
    public bool IsSuccess { get; set; }
    public string? Error { get; set; }
    public static CreateDoctorResultDto Fail(string error)
    {
        return new CreateDoctorResultDto
        {
            Error = error,
            IsSuccess = false
        };
    }

    public static CreateDoctorResultDto Success()
    {
        return new CreateDoctorResultDto
        {
            IsSuccess = true
        };
    }
}