using HospitalSystem.Services.Auth;
using Microsoft.AspNetCore.Authorization;

namespace HospitalSystem.Startup;

public static class AccessPolicies
{
    // A request must be signed in unless its endpoint allows anonymous
    // callers, and DemoReadOnly keeps demo accounts to reads.
    public static IServiceCollection AddAccessPolicies(this IServiceCollection services) =>
        services.AddAuthorization(options =>
        {
            options.FallbackPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
            options.AddPolicy(DemoReadOnly.Policy, policy => policy
                .RequireAuthenticatedUser()
                .AddRequirements(new DemoReadOnly()));
        });
}
