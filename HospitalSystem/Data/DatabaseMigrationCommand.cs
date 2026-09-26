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

        try
        {
            // Use the same appsettings/user-secrets/environment sources as the API,
            // but never construct a web host or register application services.
            var builder = Host.CreateApplicationBuilder(new HostApplicationBuilderSettings
            {
                Args = [],
                EnvironmentName = Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")
                    ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            });
            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                Console.Error.WriteLine("Database migration failed: ConnectionStrings:DefaultConnection is not configured.");
                return 1;
            }

            var commandTimeout = builder.Configuration.GetValue("Database:MigrationCommandTimeoutSeconds", 120);
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
            foreach (var migration in pending)
                Console.WriteLine($"Pending migration: {migration}");

            // EF Core 9+ and Npgsql serialize migration execution using a database lock.
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
            var sqlState = exception is PostgresException postgres ? $", SQLSTATE {postgres.SqlState}" : "";
            Console.Error.WriteLine($"Database migration failed ({exception.GetType().Name}{sqlState}). Check database access and the reviewed migration SQL.");
            return 1;
        }
    }
}
