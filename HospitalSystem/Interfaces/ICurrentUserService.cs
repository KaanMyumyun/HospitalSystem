namespace HospitalSystem.Interfaces;
public interface ICurrentUserService
{
    string? UserId { get; }
    string? UserName { get; }
    bool IsInRole(UserRole role);
}
