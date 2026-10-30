using System.Security.Claims;
using HospitalSystem.Interfaces;
using HospitalSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace HospitalSystem.Tests;

public class EndpointAccessTests
{
    private static readonly string[] Expected =
    [
        "* /health => anonymous",
        "* /health/ready => anonymous",
        "* {*path} => anonymous",
        "DELETE api/schedules/{scheduleId:int}/time-off/{timeOffId:int} => Admin",
        "GET api/appointments => FrontDesk, DemoFrontDesk",
        "GET api/appointments/mine => Doctor",
        "GET api/appointments/{appointmentId:int}/history => FrontDesk",
        "GET api/audit-logs => Admin",
        "GET api/departments => Admin, FrontDesk, DemoAdmin, DemoFrontDesk",
        "GET api/doctors => Admin, FrontDesk, DemoAdmin, DemoFrontDesk",
        "GET api/patients => FrontDesk, DemoFrontDesk",
        "GET api/patients/{patientId:int} => FrontDesk, DemoFrontDesk",
        "GET api/schedules => Admin, FrontDesk, DemoAdmin, DemoFrontDesk",
        "GET api/users => Admin",
        "PATCH api/appointments/{appointmentId:int}/status => Doctor, FrontDesk",
        "PATCH api/departments/{departmentId:int}/status => Admin",
        "PATCH api/doctors/{doctorId:int}/department => Admin",
        "PATCH api/doctors/{doctorId:int}/status => Admin",
        "PATCH api/users/{userId:int}/role => Admin",
        "POST api/appointments => FrontDesk",
        "POST api/appointments/{appointmentId:int}/cancel => FrontDesk",
        "POST api/appointments/{appointmentId:int}/move => FrontDesk",
        "POST api/auth/change-password => signed-in",
        "POST api/auth/demo-login => anonymous",
        "POST api/auth/login => anonymous",
        "POST api/auth/refresh => signed-in",
        "POST api/departments => Admin",
        "POST api/doctors => Admin",
        "POST api/schedules => Admin",
        "POST api/schedules/{scheduleId:int}/time-off => Admin",
        "POST api/users => Admin",
        "PUT api/patients/{patientId:int} => FrontDesk",
        "PUT api/schedules/{scheduleId:int} => Admin",
        "PUT api/users/{userId:int}/password => Admin"
    ];

    private static IEnumerable<RouteEndpoint> Endpoints(WebApplicationFactory<Program> app) =>
        app.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>();

    private static async Task<List<string>> AccessTableAsync(WebApplicationFactory<Program> app)
    {
        var provider = app.Services.GetRequiredService<IAuthorizationPolicyProvider>();
        var rows = new List<string>();
        foreach (var endpoint in Endpoints(app))
        {
            var policy = await AuthorizationPolicy.CombineAsync(provider, endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>());
            var roleRules = policy?.Requirements.OfType<RolesAuthorizationRequirement>().ToList() ?? [];
            var who = endpoint.Metadata.GetMetadata<IAllowAnonymous>() is not null ? "anonymous"
                : roleRules.Count == 0 ? "signed-in"
                : string.Join(", ", roleRules.Aggregate(Enum.GetNames<UserRole>().AsEnumerable(),
                    (roles, rule) => roles.Intersect(rule.AllowedRoles)));
            foreach (var method in endpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? ["*"])
                rows.Add($"{method} {endpoint.RoutePattern.RawText} => {who}");
        }
        rows.Sort(StringComparer.Ordinal);
        return rows;
    }

    private static ICurrentUserService UserIn(UserRole role)
    {
        var mock = new Mock<ICurrentUserService>();
        mock.Setup(x => x.IsInRole(It.IsAny<UserRole>())).Returns<UserRole>(r => r == role);
        return mock.Object;
    }

    [Fact]
    public async Task EveryEndpoint_LetsInTheRolesInTheTable()
    {
        await using var app = TestApp.Create();

        Assert.Equal(Expected, await AccessTableAsync(app));
    }

    [Fact]
    public async Task NoEndpoint_ListsRolesOfItsOwn()
    {
        await using var app = TestApp.Create();

        Assert.All(Endpoints(app), endpoint =>
            Assert.All(endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>(), data => Assert.Null(data.Roles)));
    }

    public static TheoryData<string> PolicyNames() => [.. Access.Policies.Keys];

    [Theory]
    [MemberData(nameof(PolicyNames))]
    public async Task EachPolicy_LetsInTheSameRolesForControllersAndServices(string policy)
    {
        await using var app = TestApp.Create();
        var authorization = app.Services.GetRequiredService<IAuthorizationService>();

        foreach (var role in Enum.GetValues<UserRole>())
        {
            var user = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Role, role.ToString())], "Bearer"));
            var controllers = (await authorization.AuthorizeAsync(user, policy)).Succeeded;

            Assert.True(controllers == UserIn(role).Allows(policy),
                $"{policy} lets {role} in for {(controllers ? "controllers but not services" : "services but not controllers")}");
        }
    }
}
