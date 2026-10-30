using Microsoft.AspNetCore.Authorization;

namespace HospitalSystem.Services.Auth;

public sealed class DemoReadOnly : AuthorizationHandler<DemoReadOnly>, IAuthorizationRequirement
{
    public const string Policy = "DemoReadOnly";

    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, DemoReadOnly requirement)
    {
        var isDemo = Access.DemoRoles.Any(role => context.User.IsInRole(role.ToString()));
        var method = (context.Resource as HttpContext)?.Request.Method;
        if (!isDemo || method is not null && (HttpMethods.IsGet(method) || HttpMethods.IsHead(method)))
            context.Succeed(requirement);

        return Task.CompletedTask;
    }
}
