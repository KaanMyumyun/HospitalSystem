namespace HospitalSystem.Interfaces.Auth;

public interface ISessionRenewalService
{
    Task<LoginResultDto> RenewAsync(CancellationToken cancellationToken = default);
}
