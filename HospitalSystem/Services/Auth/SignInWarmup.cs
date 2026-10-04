using HospitalSystem.Interfaces.Auth;
using Microsoft.Extensions.Options;

namespace HospitalSystem.Services.Auth;

// Runs the one-time parts of signing in at startup, before the server takes
// requests: opening the database connection, compiling the demo sign-in and
// token-check queries, and setting up token signing. Without it the first
// sign-ins after every start pay for them. The password check is left out on
// purpose: it costs the same on every sign-in, so running it here would only
// slow startup.
public sealed class SignInWarmup : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly JwtSettings _jwtSettings;
    private readonly ILogger<SignInWarmup> _logger;

    public SignInWarmup(IServiceScopeFactory scopeFactory, IOptions<JwtSettings> jwtOptions, ILogger<SignInWarmup> logger)
    {
        _scopeFactory = scopeFactory;
        _jwtSettings = jwtOptions.Value;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var services = scope.ServiceProvider;

            // Does nothing unless demo sign-in is enabled.
            await services.GetRequiredService<ILoginService>().DemoLoginAsync(UserRole.DemoFrontDesk);
            await SecurityStampClaims.CurrentStampAsync(services.GetRequiredService<ApplicationDbContext>(), 0);

            // A token for no real user, thrown away; it would fail the stamp check anyway.
            LoginService.GenerateToken(new UserEntity { Role = UserRole.Pending, SecurityStamp = "warm-up" }, _jwtSettings);
        }
        catch (Exception exception)
        {
            // A slower first sign-in is better than not starting at all.
            _logger.LogWarning(exception, "Sign-in warm-up failed; the first sign-in will be slower");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
