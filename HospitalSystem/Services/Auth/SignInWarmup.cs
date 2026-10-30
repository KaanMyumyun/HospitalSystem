using HospitalSystem.Interfaces.Auth;
using Microsoft.Extensions.Options;

namespace HospitalSystem.Services.Auth;

public sealed class SignInWarmup(
    IServiceScopeFactory scopeFactory,
    IOptions<JwtSettings> jwtOptions,
    ILogger<SignInWarmup> logger) : IHostedService
{
    private readonly JwtSettings _jwtSettings = jwtOptions.Value;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var services = scope.ServiceProvider;

            await services.GetRequiredService<ILoginService>().DemoLoginAsync(UserRole.DemoFrontDesk, cancellationToken);
            await SecurityStampClaims.CurrentStampAsync(
                services.GetRequiredService<ApplicationDbContext>(), 0, cancellationToken);

            SessionTokens.Issue(
                new UserEntity { Name = "warm-up", Role = UserRole.Pending, SecurityStamp = "warm-up" }, _jwtSettings, DateTimeOffset.UtcNow);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Sign-in warm-up failed; the first sign-in will be slower");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
