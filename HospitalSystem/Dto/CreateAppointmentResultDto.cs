namespace HospitalSystem.Dto;

public class CreateAppointmentResultDto : OperationResult<CreateAppointmentResultDto>
{
    public bool IsConflict => Failure == FailureKind.Conflict;

    // Set, with a conflict, when the details partly match patients on file.
    public List<PatientMatchDto>? PossibleMatches { get; set; }

    public static CreateAppointmentResultDto PossibleMatch(string error, List<PatientMatchDto> possibleMatches) =>
        new() { Error = error, Failure = FailureKind.Conflict, PossibleMatches = possibleMatches };
}
