public class CalendarActionResult
{
    public bool IsSuccess { get; set; }

    public string? Error { get; set; }
    public static CalendarActionResult Fail(string error)
    {
        return new CalendarActionResult
        {
            Error = error,
            IsSuccess = false
        };
    }

    public static CalendarActionResult Success()
    {
        return new CalendarActionResult
        {
            IsSuccess = true
        };
    }
}