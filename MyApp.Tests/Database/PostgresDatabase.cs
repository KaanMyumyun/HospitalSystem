using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HospitalSystem.Tests;

public sealed class PostgresFactAttribute : FactAttribute
{
    public const string Variable = "HOSPITALSYSTEM_TEST_POSTGRES";

    public PostgresFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(Variable)))
            Skip = $"Set {Variable} to a PostgreSQL connection string to run the database tests";
    }
}

public sealed class PostgresDatabase : IAsyncDisposable
{
    private readonly string _serverConnection;

    private PostgresDatabase(string serverConnection, string name, string connectionString)
    {
        _serverConnection = serverConnection;
        Name = name;
        ConnectionString = connectionString;
    }

    public string Name { get; }
    public string ConnectionString { get; }

    public static async Task<PostgresDatabase> CreateAsync()
    {
        var server = Environment.GetEnvironmentVariable(PostgresFactAttribute.Variable)!;
        var name = "hs_test_" + Guid.NewGuid().ToString("N")[..12];
        await ExecuteAsync(server, $"CREATE DATABASE \"{name}\"");
        var connectionString = new NpgsqlConnectionStringBuilder(server) { Database = name, Pooling = false }.ConnectionString;
        return new PostgresDatabase(server, name, connectionString);
    }

    public ApplicationDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(ConnectionString).Options);

    public async Task<ApplicationDbContext> CreateMigratedContextAsync()
    {
        var db = CreateContext();
        await db.Database.MigrateAsync();
        return db;
    }

    public Task ExecuteAsync(string sql) => ExecuteAsync(ConnectionString, sql);

    public async Task<T?> ScalarAsync<T>(string sql)
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(sql, connection);
        var value = await command.ExecuteScalarAsync();
        return value is null or DBNull ? default : (T)value;
    }

    public ValueTask DisposeAsync() => new(ExecuteAsync(_serverConnection, $"DROP DATABASE IF EXISTS \"{Name}\" WITH (FORCE)"));

    private static async Task ExecuteAsync(string connectionString, string sql)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync();
    }
}
