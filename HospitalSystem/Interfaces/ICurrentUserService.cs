namespace HospitalSystem.Interfaces;
public interface ICurrentUserService
{
    string? UserId { get; }
    string? UserName { get; }
    DateTimeOffset? SignedInAt { get; }
    bool IsInRole(UserRole role);
}
