namespace HospitalSystem.Dto;

public class ChangeDoctorsStatusResult : BookingChangeResult<ChangeDoctorsStatusResult>
{
    public ChangeDoctorsStatus? Name { get; set; }

    public static ChangeDoctorsStatusResult Success(ChangeDoctorsStatus name) =>
        new() { IsSuccess = true, Name = name };
}
