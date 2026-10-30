namespace HospitalSystem.Dto;

public class ChangePasswordResultDto : OperationResult<ChangePasswordResultDto>
{
    public string? Token { get; set; }
}
