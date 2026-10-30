using HospitalSystem.Interfaces;

namespace HospitalSystem.Services;

public static class Access
{
    public const string Admin = nameof(Admin);

    public const string Desk = nameof(Desk);

    public const string DeskReads = nameof(DeskReads);

    public const string Doctor = nameof(Doctor);

    public const string DeskOrDoctor = nameof(DeskOrDoctor);

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

    public static readonly UserRole[] DemoRoles = [UserRole.DemoAdmin, UserRole.DemoFrontDesk];

    public static bool Allows(this ICurrentUserService user, string policy) => Policies[policy].Any(user.IsInRole);

    public static bool IsAdmin(this ICurrentUserService user) => user.Allows(Admin);

    public static bool IsDesk(this ICurrentUserService user) => user.Allows(Desk);

    public static bool IsDemo(this ICurrentUserService user) => DemoRoles.Any(user.IsInRole);

    public static bool CanReadReferenceData(this ICurrentUserService user) => user.Allows(ReferenceData);

    public static TResult? RequireAdmin<TResult>(this ICurrentUserService user, string action)
        where TResult : OperationResult<TResult>, new() =>
        user.IsAdmin() ? null : OperationResult<TResult>.Forbidden($"You are not allowed to {action}");
}
