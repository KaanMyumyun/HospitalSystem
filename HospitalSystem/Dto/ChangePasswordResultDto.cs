namespace HospitalSystem.Dto;

// A new token comes back with success: changing the password signs out every
// other session, and this one carries on with the new token.
public class ChangePasswordResultDto : OperationResult<ChangePasswordResultDto>
{
    public string? Token { get; set; }
}
