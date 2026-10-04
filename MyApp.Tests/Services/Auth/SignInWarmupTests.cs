using HospitalSystem.Interfaces.Auth;
using HospitalSystem.Services.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace HospitalSystem.Tests;

public class SignInWarmupTests : AuthTestBase
{
    [Fact]
    public async Task StartAsync_WithDemoAccount_CompletesWithoutWarning()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using (var db = new ApplicationDbContext(options))
            await SeedUserAsync(db, UserRole.DemoFrontDesk, "DemoReception");
        var logger = new RecordingLogger<SignInWarmup>();
        var warmup = CreateWarmup(services => services
            .AddScoped(_ => new ApplicationDbContext(options))
            .AddScoped<ILoginService>(provider => new LoginService(
                provider.GetRequiredService<ApplicationDbContext>(), CreateJwtOptions(), CreateDemoOptions())), logger);

        await warmup.StartAsync(CancellationToken.None);

        Assert.Empty(logger.Warnings);
    }

    [Fact]
    public async Task StartAsync_WhenSignInFails_LogsWarningAndCompletes()
    {
        var login = new Mock<ILoginService>();
        login.Setup(x => x.DemoLoginAsync(It.IsAny<UserRole>()))
            .ThrowsAsync(new InvalidOperationException("database unavailable"));
        var logger = new RecordingLogger<SignInWarmup>();
        var warmup = CreateWarmup(services => services.AddScoped(_ => login.Object), logger);

        await warmup.StartAsync(CancellationToken.None);

        Assert.Single(logger.Warnings);
    }

    private SignInWarmup CreateWarmup(Action<IServiceCollection> register, ILogger<SignInWarmup> logger)
    {
        var services = new ServiceCollection();
        register(services);
        var provider = services.BuildServiceProvider();
        return new SignInWarmup(provider.GetRequiredService<IServiceScopeFactory>(), CreateJwtOptions(), logger);
    }

    private sealed class RecordingLogger<T> : ILogger<T>
    {
        public List<string> Warnings { get; } = new();

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (logLevel == LogLevel.Warning)
                Warnings.Add(formatter(state, exception));
        }
    }
}
