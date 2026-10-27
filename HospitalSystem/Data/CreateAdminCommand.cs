using System.Text;
using HospitalSystem.Services.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HospitalSystem.Data;

/// <summary>Creates an admin account without starting the API.</summary>
public static class CreateAdminCommand
{
    // What the audit log shows as the actor: nobody is signed in.
    public const string ActorName = "Command line";

    // A new database has no users, and only an admin can create users through
    // the API, so the first admin comes from here, after --migrate. The
    // password is read from standard input, never from the command line, so
    // it stays out of the shell history and the process list.
    public static async Task<int> RunAsync(string[] args, TextReader input, CancellationToken cancellationToken = default)
    {
        if (args.Length != 2 || args[0] != "--create-admin")
        {
            Console.Error.WriteLine("Usage: dotnet HospitalSystem.dll --create-admin <username>. The password is read from standard input.");
            return 2;
        }

        try
        {
            var connectionString = DatabaseMigrationCommand.LoadConfiguration().GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                Console.Error.WriteLine("Creating the admin failed: ConnectionStrings:DefaultConnection is not configured.");
                return 1;
            }

            var password = ReadPassword(input, "Password: ");
            if (!Console.IsInputRedirected && ReadPassword(input, "Repeat the password: ") != password)
            {
                Console.Error.WriteLine("Creating the admin failed: the passwords do not match.");
                return 1;
            }

            await using var db = new ApplicationDbContext(
                new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(connectionString).Options);
            var error = await CreateAsync(db, args[1], password ?? "", new PasswordHasher<UserEntity>(), cancellationToken);
            if (error is not null)
            {
                Console.Error.WriteLine($"Creating the admin failed: {error}");
                return 1;
            }

            Console.WriteLine($"Created admin {args[1].Trim()}.");
            return 0;
        }
        catch (OperationCanceledException)
        {
            Console.Error.WriteLine("Creating the admin was cancelled.");
            return 1;
        }
        catch (Exception exception)
        {
            // Like --migrate, never the exception's message: it can contain the
            // connection string or SQL.
            var sqlState = exception is PostgresException postgres ? $", SQLSTATE {postgres.SqlState}" : "";
            Console.Error.WriteLine($"Creating the admin failed ({exception.GetType().Name}{sqlState}). Check database access, and that --migrate has run.");
            return 1;
        }
    }

    // Null when the admin was created; otherwise why not.
    public static async Task<string?> CreateAsync(
        ApplicationDbContext db,
        string userName,
        string password,
        IPasswordHasher<UserEntity> hasher,
        CancellationToken cancellationToken = default)
    {
        var name = userName.Trim();
        if ((AccountRules.UsernameError(name) ?? AccountRules.PasswordError(password)) is { } error)
            return error;

        var nameKey = name.ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Name.ToLower() == nameKey, cancellationToken))
            return $"a user named {name} already exists (usernames ignore case)";

        var user = new UserEntity { Name = name, Role = UserRole.Admin };
        user.PasswordHash = hasher.HashPassword(user, password);

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        db.AuditLogs.Add(new AuditLogEntity
        {
            Action = "CreateUser",
            EntityType = "User",
            EntityId = user.Id,
            Details = $"Created admin {user.Name} from the command line",
            ActorName = ActorName,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return null;
    }

    // A line from the input when it is redirected; typed without echo otherwise.
    private static string? ReadPassword(TextReader input, string prompt)
    {
        if (Console.IsInputRedirected)
            return input.ReadLine();

        Console.Error.Write(prompt);
        var password = new StringBuilder();
        for (var key = Console.ReadKey(intercept: true); key.Key != ConsoleKey.Enter; key = Console.ReadKey(intercept: true))
        {
            if (key.Key == ConsoleKey.Backspace)
            {
                if (password.Length > 0)
                    password.Length--;
            }
            else if (!char.IsControl(key.KeyChar))
            {
                password.Append(key.KeyChar);
            }
        }
        Console.Error.WriteLine();
        return password.ToString();
    }
}
