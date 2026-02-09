namespace HospitalSystem.Interface;
public interface ICurrentUserService
{
    string UserId { get; }
    bool IsInRole(UserRole role);
}
