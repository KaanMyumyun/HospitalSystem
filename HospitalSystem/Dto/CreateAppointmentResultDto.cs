public class CreateAppointmentResultDto
{
    public bool IsSuccess { get; set; }
    public string Error { get; set; }
       public static CreateAppointmentResultDto Fail(string error)
    {
        return new CreateAppointmentResultDto
        {
        Error = error,
        IsSuccess = false
        };
    }
    public static CreateAppointmentResultDto Success()
    {
        return new CreateAppointmentResultDto
        {
            IsSuccess = true
        };
    }
}