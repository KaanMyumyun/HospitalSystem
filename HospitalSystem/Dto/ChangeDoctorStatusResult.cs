public class ChangeDoctorsStatusResult
{
    public bool IsSuccess { get; set; }
    public string? Error { get; set; }
    public ChangeDoctorsStatus? Name { get; set; }
    public static ChangeDoctorsStatusResult Fail(string error)
    {
        return new ChangeDoctorsStatusResult
        {
            Error = error,
            IsSuccess = false
        };
    }

    public static ChangeDoctorsStatusResult Success(ChangeDoctorsStatus name)
    {
        return new ChangeDoctorsStatusResult
        {
            Name = name,
            IsSuccess = true
        };
    }
}