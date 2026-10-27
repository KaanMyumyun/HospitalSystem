using System.Security.Claims;
using HospitalSystem.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;

namespace HospitalSystem.Tests;

public class DemoReadOnlyTests
{
    private static async Task<bool> IsAllowedAsync(UserRole role, string method)
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Role, role.ToString())], "Bearer"));
        var request = new DefaultHttpContext();
        request.Request.Method = method;
        var requirement = new DemoReadOnly();
        var context = new AuthorizationHandlerContext([requirement], user, request);

        await requirement.HandleAsync(context);

        return context.HasSucceeded;
    }

    [Theory]
    [InlineData(UserRole.DemoAdmin, "GET")]
    [InlineData(UserRole.DemoFrontDesk, "HEAD")]
    [InlineData(UserRole.Admin, "POST")]
    [InlineData(UserRole.FrontDesk, "DELETE")]
    [InlineData(UserRole.Doctor, "PATCH")]
    public async Task ReadsAndEveryOtherRole_AreAllowed(UserRole role, string method) =>
        Assert.True(await IsAllowedAsync(role, method));

    [Theory]
    [InlineData(UserRole.DemoAdmin, "POST")]
    [InlineData(UserRole.DemoAdmin, "PUT")]
    [InlineData(UserRole.DemoFrontDesk, "PATCH")]
    [InlineData(UserRole.DemoFrontDesk, "DELETE")]
    public async Task ChangesFromDemoAccounts_AreRefused(UserRole role, string method) =>
        Assert.False(await IsAllowedAsync(role, method));
}
