using Microsoft.AspNetCore.Authorization;

namespace HospitalSystem.Services.Auth;

// Demo accounts can look at everything they are shown but change nothing,
// whatever roles an endpoint lists: a request from one must be a read.
// Program.cs requires this of every controller endpoint, so a new endpoint
// that lists a demo role still cannot be used to change data.
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
