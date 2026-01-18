public class CancelAppointmentResultDto
{
    public bool IsSuccess { get; set; }
  
    public string Error { get; set; }
       public static CancelAppointmentResultDto Fail(string error)
    {
        return new CancelAppointmentResultDto
        {
        Error = error,
        IsSuccess = false
        };
    }

    public static CancelAppointmentResultDto Success()
    {
        return new CancelAppointmentResultDto
        {
            IsSuccess = true
        };
    }
}