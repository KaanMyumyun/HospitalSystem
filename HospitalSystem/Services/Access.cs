using HospitalSystem.Interfaces;

namespace HospitalSystem.Services;

// Who may do what, written once. Each policy names the roles it allows:
// Program.cs registers them, controllers name them in [Authorize(Policy =
// ...)], and services ask the same question through Allows, so a service
// stays safe when it is called from somewhere else.
public static class Access
{
    public const string Admin = nameof(Admin);

    // Booking, moving and cancelling, a booking's history and corrections to
    // patients: the front desk itself.
    public const string Desk = nameof(Desk);

    // Appointments and patients to look at: the front desk and its demo.
    public const string DeskReads = nameof(DeskReads);

    // A doctor's own appointments.
    public const string Doctor = nameof(Doctor);

    // Marking an appointment completed or a no-show.
    public const string DeskOrDoctor = nameof(DeskOrDoctor);

    // Departments, doctors and schedules: what the admin and reception screens
    // share, for real and demo accounts alike.
    public const string ReferenceData = nameof(ReferenceData);

    public static readonly IReadOnlyDictionary<string, UserRole[]> Policies = new Dictionary<string, UserRole[]>
    {
        [Admin] = [UserRole.Admin],
        [Desk] = [UserRole.FrontDesk],
        [DeskReads] = [UserRole.FrontDesk, UserRole.DemoFrontDesk],
        [Doctor] = [UserRole.Doctor],
        [DeskOrDoctor] = [UserRole.FrontDesk, UserRole.Doctor],
        [ReferenceData] = [UserRole.Admin, UserRole.FrontDesk, UserRole.DemoAdmin, UserRole.DemoFrontDesk]
    };

    // Accounts that may look but never change anything (DemoReadOnly).
    public static readonly UserRole[] DemoRoles = [UserRole.DemoAdmin, UserRole.DemoFrontDesk];

    public static bool Allows(this ICurrentUserService user, string policy) => Policies[policy].Any(user.IsInRole);

    public static bool IsAdmin(this ICurrentUserService user) => user.Allows(Admin);

    public static bool IsDesk(this ICurrentUserService user) => user.Allows(Desk);

    public static bool IsDemo(this ICurrentUserService user) => DemoRoles.Any(user.IsInRole);

    public static bool CanReadReferenceData(this ICurrentUserService user) => user.Allows(ReferenceData);

    // Null for an admin; otherwise the refusal to return, worded the same way
    // everywhere: "You are not allowed to {action}".
    public static TResult? RequireAdmin<TResult>(this ICurrentUserService user, string action)
        where TResult : OperationResult<TResult>, new() =>
        user.IsAdmin() ? null : OperationResult<TResult>.Forbidden($"You are not allowed to {action}");
}
