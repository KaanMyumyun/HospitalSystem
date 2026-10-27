using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HospitalSystem.Data;

/// <summary>Runs the migrations compiled into this release without starting the API.</summary>
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

    // Applies the migrations the database does not have yet, for --migrate and
    // for an API that starts with Database:RunMigrationsOnStartup: 0 on success,
    // 1 on failure. Only migration ids and safe status reach the console.
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

            // Do not attach the host logger: failed SQL and provider exception messages
            // may contain sensitive data. Emit only release migration IDs and safe status.
            Console.WriteLine("Applying database migrations.");
            var pending = (await db.Database.GetPendingMigrationsAsync(cancellationToken)).ToArray();
            if (pending.Length == 0)
            {
                // Most API starts, so they skip taking the migration lock.
                Console.WriteLine("No pending migrations: the database is up to date.");
                return 0;
            }

            foreach (var migration in pending)
                Console.WriteLine($"Pending migration: {migration}");

            // EF Core 9+ and Npgsql serialize migration execution using a database lock
            // (LOCK TABLE on the history table, held for a transaction).
            // This applies only Up migrations; image rollback must not downgrade schema.
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

    // Migrations can have a connection of their own, ConnectionStrings:Migrations,
    // such as Neon's direct host where the API uses the pooled one, as Neon
    // advises for schema changes. Without it, the API's.
    private static string? MigrationConnectionString(IConfiguration configuration)
    {
        var migrations = configuration.GetConnectionString("Migrations");
        return string.IsNullOrWhiteSpace(migrations) ? configuration.GetConnectionString("DefaultConnection") : migrations;
    }

    // The same appsettings, user-secrets and environment sources as the API,
    // without constructing a web host or registering application services.
    internal static IConfiguration LoadConfiguration() =>
        Host.CreateApplicationBuilder(new HostApplicationBuilderSettings
        {
            Args = [],
            EnvironmentName = Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")
                ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
        }).Configuration;
}
