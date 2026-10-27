using System.Diagnostics;

namespace MyApp.Tests.Data;

public class DatabaseMigrationCommandTests
{
    [Fact]
    public async Task MissingDatabaseConfiguration_ExitsWithoutStartingApiOrRequiringJwt()
    {
        var result = await RunCommandAsync("");

        Assert.Equal(1, result.ExitCode);
        Assert.Contains("ConnectionStrings:DefaultConnection is not configured", result.Error);
        Assert.DoesNotContain("JWT", result.Output + result.Error);
        Assert.DoesNotContain("Now listening", result.Output);
    }

    [Fact]
    public async Task InvalidConnectionString_DoesNotLogItsContents()
    {
        const string secret = "must-never-appear-in-logs";
        var result = await RunCommandAsync($"Host=localhost;Password={secret};UnknownKeyword={secret}");

        Assert.Equal(1, result.ExitCode);
        Assert.Contains("Database migration failed", result.Error);
        Assert.DoesNotContain(secret, result.Output + result.Error);
        Assert.DoesNotContain("Now listening", result.Output);
    }

    [Fact]
    public async Task AdditionalArguments_AreRejectedBeforeAccessingDatabase()
    {
        var result = await RunCommandAsync("", "--migrate", "--urls=http://localhost:5999");

        Assert.Equal(2, result.ExitCode);
        Assert.Contains("Usage:", result.Error);
        Assert.DoesNotContain("Applying database migrations", result.Output);
    }

    [Fact]
    public async Task InvalidTimeout_ExitsBeforeAccessingDatabase()
    {
        var result = await RunCommandAsync("Host=localhost", timeout: "0");

        Assert.Equal(1, result.ExitCode);
        Assert.Contains("MigrationCommandTimeoutSeconds must be greater than zero", result.Error);
        Assert.DoesNotContain("Applying database migrations", result.Output);
    }

    [Fact]
    public async Task MigrationsConnectionString_IsUsedInsteadOfTheApis()
    {
        const string secret = "must-never-appear-in-logs";
        var result = await RunCommandAsync("", environment: new()
        {
            ["ConnectionStrings__Migrations"] = $"Host=localhost;Password={secret};UnknownKeyword={secret}",
        });

        Assert.Equal(1, result.ExitCode);
        Assert.Contains("Database migration failed (", result.Error);
        Assert.DoesNotContain("is not configured", result.Error);
        Assert.DoesNotContain(secret, result.Output + result.Error);
    }

    // Database:RunMigrationsOnStartup runs the same migrations when the API
    // starts. If they fail, the API stops before it listens, so a platform that
    // waits for the new release keeps the previous one serving.
    [Fact]
    public async Task StartupMigrationFailure_StopsTheApiBeforeItListens()
    {
        const string secret = "must-never-appear-in-logs";
        var result = await RunCommandAsync("Host=127.0.0.1;Port=1", firstArgument: null, environment: new()
        {
            ["ConnectionStrings__Migrations"] = $"Host=127.0.0.1;Port=1;Timeout=2;Password={secret}",
            ["JwtSettings__SecretKey"] = Convert.ToBase64String(Guid.NewGuid().ToByteArray()) + Guid.NewGuid().ToString("N"),
            ["JwtSettings__Issuer"] = "HospitalSystem",
            ["JwtSettings__Audience"] = "HospitalSystemUsers",
            ["Clinic__TimeZone"] = "Europe/Sofia",
            ["Metrics__Port"] = "0",
            ["ASPNETCORE_URLS"] = "http://127.0.0.1:0",
        });

        Assert.Equal(1, result.ExitCode);
        Assert.Contains("Database migration failed (", result.Error);
        Assert.DoesNotContain("Now listening", result.Output);
        Assert.DoesNotContain(secret, result.Output + result.Error);
    }

    // firstArgument null starts the API itself; environment is set last.
    private static async Task<(int ExitCode, string Output, string Error)> RunCommandAsync(
        string connectionString, string? firstArgument = "--migrate", string? secondArgument = null,
        string timeout = "120", Dictionary<string, string>? environment = null)
    {
        var directory = Directory.CreateTempSubdirectory("hospital-migration-test-");
        try
        {
            var start = new ProcessStartInfo("dotnet")
            {
                WorkingDirectory = directory.FullName,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false
            };
            start.ArgumentList.Add(typeof(ApplicationDbContext).Assembly.Location);
            if (firstArgument is not null)
                start.ArgumentList.Add(firstArgument);
            if (secondArgument is not null)
                start.ArgumentList.Add(secondArgument);
            start.Environment["DOTNET_ENVIRONMENT"] = "Production";
            start.Environment["ASPNETCORE_ENVIRONMENT"] = "Production";
            start.Environment["ConnectionStrings__DefaultConnection"] = connectionString;
            start.Environment["JwtSettings__SecretKey"] = "";
            start.Environment["Database__RunMigrationsOnStartup"] = "true";
            start.Environment["Database__MigrationCommandTimeoutSeconds"] = timeout;
            foreach (var (name, value) in environment ?? [])
                start.Environment[name] = value;

            using var process = Process.Start(start)!;
            var output = process.StandardOutput.ReadToEndAsync();
            var error = process.StandardError.ReadToEndAsync();
            using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(20));
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
