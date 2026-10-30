namespace HospitalSystem.Dto;

public class CreateAppointmentResultDto : OperationResult<CreateAppointmentResultDto>
{
    public bool IsConflict => Failure == FailureKind.Conflict;

    public List<PatientMatchDto>? PossibleMatches { get; set; }

    public static CreateAppointmentResultDto PossibleMatch(string error, List<PatientMatchDto> possibleMatches) =>
        new() { Error = error, Failure = FailureKind.Conflict, PossibleMatches = possibleMatches };
}
