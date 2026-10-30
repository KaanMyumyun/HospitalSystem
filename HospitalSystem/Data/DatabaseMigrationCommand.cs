using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HospitalSystem.Data;

public static class DatabaseMigrationCommand
{
    public static async Task<int> RunAsync(string[] args, CancellationToken cancellationToken = default)
    {
        if (args.Length != 1 || args[0] != "--migrate")
        {
            Console.Error.WriteLine("Usage: dotnet HospitalSystem.dll --migrate. Configure the database using environment variables or appsettings.");
            return 2;
        }

        IConfiguration configuration;
        try
        {
            configuration = LoadConfiguration();
        }
        catch (Exception exception)
        {
            return Failed(exception);
        }

        return await ApplyAsync(configuration, cancellationToken);
    }

    public static async Task<int> ApplyAsync(IConfiguration configuration, CancellationToken cancellationToken = default)
    {
        try
        {
            var connectionString = MigrationConnectionString(configuration);
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                Console.Error.WriteLine("Database migration failed: ConnectionStrings:DefaultConnection is not configured.");
                return 1;
            }

            var commandTimeout = configuration.GetValue("Database:MigrationCommandTimeoutSeconds", 120);
            if (commandTimeout <= 0)
            {
                Console.Error.WriteLine("Database migration failed: Database:MigrationCommandTimeoutSeconds must be greater than zero.");
                return 1;
            }

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseNpgsql(connectionString, postgres => postgres.CommandTimeout(commandTimeout))
                .Options;
            await using var db = new ApplicationDbContext(options);

            Console.WriteLine("Applying database migrations.");
            var pending = (await db.Database.GetPendingMigrationsAsync(cancellationToken)).ToArray();
            if (pending.Length == 0)
            {
                Console.WriteLine("No pending migrations: the database is up to date.");
                return 0;
            }

            foreach (var migration in pending)
                Console.WriteLine($"Pending migration: {migration}");

            await db.Database.MigrateAsync(cancellationToken);
            Console.WriteLine("Database migrations completed successfully.");
            return 0;
        }
        catch (OperationCanceledException)
        {
            Console.Error.WriteLine("Database migration cancelled.");
            return 1;
        }
        catch (Exception exception)
        {
            return Failed(exception);
        }
    }

    private static int Failed(Exception exception)
    {
        var sqlState = exception is PostgresException postgres ? $", SQLSTATE {postgres.SqlState}" : "";
        Console.Error.WriteLine($"Database migration failed ({exception.GetType().Name}{sqlState}). Check database access and the reviewed migration SQL.");
        return 1;
    }

    private static string? MigrationConnectionString(IConfiguration configuration)
    {
        var migrations = configuration.GetConnectionString("Migrations");
        return string.IsNullOrWhiteSpace(migrations) ? configuration.GetConnectionString("DefaultConnection") : migrations;
    }

    internal static IConfiguration LoadConfiguration() =>
        Host.CreateApplicationBuilder(new HostApplicationBuilderSettings
        {
            Args = [],
            EnvironmentName = Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")
                ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
        }).Configuration;
}
