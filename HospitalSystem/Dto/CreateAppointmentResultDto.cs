namespace HospitalSystem.Dto;

public class CreateAppointmentResultDto
{
    public bool IsSuccess { get; set; }
    public string? Error { get; set; }
    public bool IsConflict { get; set; }

    // Set, with IsConflict, when the details partly match patients on file.
    public List<PatientMatchDto>? PossibleMatches { get; set; }

       public static CreateAppointmentResultDto Fail(string error)
    {
        return new CreateAppointmentResultDto
        {
        Error = error,
        IsSuccess = false
        };
    }
    public static CreateAppointmentResultDto FailConflict(string error)
    {
        return new CreateAppointmentResultDto
        {
            Error = error,
            IsSuccess = false,
            IsConflict = true
        };
    }
    public static CreateAppointmentResultDto FailPossibleMatch(string error, List<PatientMatchDto> possibleMatches)
    {
        return new CreateAppointmentResultDto
        {
            Error = error,
            IsSuccess = false,
            IsConflict = true,
            PossibleMatches = possibleMatches
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