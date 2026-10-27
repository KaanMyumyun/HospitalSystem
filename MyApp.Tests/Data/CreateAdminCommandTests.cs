using System.Diagnostics;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Tests;

public class CreateAdminCommandTests
{
    private const string Password = "correct-horse-battery";

    private static ApplicationDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    [Fact]
    public async Task CreateAsync_MakesAnAdminWhoCanSignIn_AndAuditsIt()
    {
        using var db = CreateDbContext();
        var hasher = new PasswordHasher<UserEntity>();

        var error = await CreateAdminCommand.CreateAsync(db, " admin ", Password, hasher);

        Assert.Null(error);
        var user = await db.Users.SingleAsync();
        Assert.Equal("admin", user.Name);
        Assert.Equal(UserRole.Admin, user.Role);
        Assert.False(string.IsNullOrEmpty(user.SecurityStamp));
        Assert.Equal(PasswordVerificationResult.Success, hasher.VerifyHashedPassword(user, user.PasswordHash, Password));
        var entry = await db.AuditLogs.SingleAsync();
        Assert.Equal("CreateUser", entry.Action);
        Assert.Equal(user.Id, entry.EntityId);
        Assert.Null(entry.ActorUserId);
        Assert.Equal(CreateAdminCommand.ActorName, entry.ActorName);
    }

    [Theory]
    [InlineData("1admin", Password, "Username must start with a letter")]
    [InlineData("ad", Password, "Username must start with a letter")]
    [InlineData("admin", "short", "Password must be at least 8 characters long")]
    public async Task CreateAsync_RefusesWhatTheUsersTabRefuses(string userName, string password, string expected)
    {
        using var db = CreateDbContext();

        var error = await CreateAdminCommand.CreateAsync(db, userName, password, new PasswordHasher<UserEntity>());

        Assert.StartsWith(expected, error);
        Assert.Empty(db.Users);
    }

    [Fact]
    public async Task CreateAsync_RefusesATakenUsernameInAnyCase()
    {
        using var db = CreateDbContext();
        db.Users.Add(new UserEntity { Name = "admin", PasswordHash = "x", Role = UserRole.FrontDesk });
        await db.SaveChangesAsync();

        var error = await CreateAdminCommand.CreateAsync(db, "ADMIN", Password, new PasswordHasher<UserEntity>());

        Assert.Equal("a user named ADMIN already exists (usernames ignore case)", error);
        Assert.Equal(UserRole.FrontDesk, (await db.Users.SingleAsync()).Role);
    }

    [Theory]
    [InlineData("")]
    [InlineData("admin --urls=http://localhost:5999")]
    public async Task AnythingButOneUsername_IsRefusedBeforeTheDatabase(string extra)
    {
        var result = await RunAsync("Host=localhost", Password, ["--create-admin", .. extra.Split(' ', StringSplitOptions.RemoveEmptyEntries)]);

        Assert.Equal(2, result.ExitCode);
        Assert.Contains("Usage:", result.Error);
    }

    [Fact]
    public async Task MissingDatabaseConfiguration_ExitsWithoutStartingTheApi()
    {
        var result = await RunAsync("", Password, ["--create-admin", "admin"]);

        Assert.Equal(1, result.ExitCode);
        Assert.Contains("ConnectionStrings:DefaultConnection is not configured", result.Error);
        Assert.DoesNotContain("Now listening", result.Output);
    }

    // The whole command against a migrated database, the password piped in.
    [PostgresFact]
    public async Task OnAMigratedDatabase_CreatesTheAdmin()
    {
        await using var database = await PostgresDatabase.CreateAsync();
        await using var db = await database.CreateMigratedContextAsync();

        var created = await RunAsync(database.ConnectionString, Password, ["--create-admin", "admin"]);
        var again = await RunAsync(database.ConnectionString, Password, ["--create-admin", "Admin"]);

        Assert.Equal(0, created.ExitCode);
        Assert.Contains("Created admin admin.", created.Output);
        Assert.DoesNotContain(Password, created.Output + created.Error);
        Assert.Equal(1, again.ExitCode);
        Assert.Contains("already exists", again.Error);
        var user = await db.Users.SingleAsync();
        Assert.Equal(UserRole.Admin, user.Role);
        Assert.Equal(PasswordVerificationResult.Success,
            new PasswordHasher<UserEntity>().VerifyHashedPassword(user, user.PasswordHash, Password));
    }

    private static async Task<(int ExitCode, string Output, string Error)> RunAsync(
        string connectionString, string password, string[] arguments)
    {
        var directory = Directory.CreateTempSubdirectory("hospital-create-admin-test-");
        try
        {
            var start = new ProcessStartInfo("dotnet")
            {
                WorkingDirectory = directory.FullName,
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false
            };
            start.ArgumentList.Add(typeof(ApplicationDbContext).Assembly.Location);
            foreach (var argument in arguments)
                start.ArgumentList.Add(argument);
            start.Environment["DOTNET_ENVIRONMENT"] = "Production";
            start.Environment["ASPNETCORE_ENVIRONMENT"] = "Production";
            start.Environment["ConnectionStrings__DefaultConnection"] = connectionString;
            start.Environment["JwtSettings__SecretKey"] = "";

            using var process = Process.Start(start)!;
            await process.StandardInput.WriteLineAsync(password);
            process.StandardInput.Close();
            var output = process.StandardOutput.ReadToEndAsync();
            var error = process.StandardError.ReadToEndAsync();
            using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            try
            {
                await process.WaitForExitAsync(deadline.Token);
            }
            catch
            {
                process.Kill(entireProcessTree: true);
                throw;
            }

            return (process.ExitCode, await output, await error);
        }
        finally
        {
            directory.Delete(recursive: true);
        }
    }
}
