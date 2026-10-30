using HospitalSystem.Services;
using HospitalSystem.Services.Auth;
using Microsoft.AspNetCore.Authorization;

namespace HospitalSystem.Startup;

public static class AccessPolicies
{
    public static IServiceCollection AddAccessPolicies(this IServiceCollection services) =>
        services.AddAuthorization(options =>
        {
            options.FallbackPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
            options.AddPolicy(DemoReadOnly.Policy, policy => policy
                .RequireAuthenticatedUser()
                .AddRequirements(new DemoReadOnly()));
            foreach (var (name, roles) in Access.Policies)
            {
                options.AddPolicy(name, policy => policy
                    .RequireAuthenticatedUser()
                    .RequireRole(roles.Select(role => role.ToString())));
            }
        });
}
