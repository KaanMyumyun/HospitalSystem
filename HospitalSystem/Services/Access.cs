using HospitalSystem.Interfaces;

namespace HospitalSystem.Services;

// Who may do what, written once. Controllers check the same roles in their
// [Authorize] attributes; services check again, so a service stays safe when
// it is called from somewhere else.
public static class Access
{
    public static bool IsAdmin(this ICurrentUserService user) => user.IsInRole(UserRole.Admin);

    public static bool IsDesk(this ICurrentUserService user) => user.IsInRole(UserRole.FrontDesk);

    public static bool IsDemo(this ICurrentUserService user) =>
        user.IsInRole(UserRole.DemoAdmin) || user.IsInRole(UserRole.DemoFrontDesk);

    // Departments, doctors and schedules: what the admin and reception screens
    // share, for real and demo accounts alike.
    public static bool CanReadReferenceData(this ICurrentUserService user) =>
        user.IsAdmin() || user.IsDesk() || user.IsDemo();

    // Null for an admin; otherwise the refusal to return, worded the same way
    // everywhere: "You are not allowed to {action}".
    public static TResult? RequireAdmin<TResult>(this ICurrentUserService user, string action)
        where TResult : OperationResult<TResult>, new() =>
        user.IsAdmin() ? null : OperationResult<TResult>.Forbidden($"You are not allowed to {action}");
}
