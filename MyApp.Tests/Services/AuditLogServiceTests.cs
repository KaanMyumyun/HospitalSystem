using HospitalSystem.Interfaces;
using HospitalSystem.Services;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace HospitalSystem.Tests;

public class AuditLogServiceTests
{
    private static ApplicationDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static ICurrentUserService Caller(string? userId)
    {
        var mock = new Mock<ICurrentUserService>();
        mock.Setup(x => x.UserId).Returns(userId);
        return mock.Object;
    }

    // An entry is saved with the change it describes, so a failed change
    // leaves no entry behind.
    [Fact]
    public async Task LogAsync_AddsAnEntryThatTheCallersSaveWrites()
    {
        using var db = CreateDbContext();
        var service = new AuditLogService(db, Caller("7"));

        await service.LogAsync("CreateDepartment", "Department", 3, "Created department Cardiology");
        Assert.Empty(await db.AuditLogs.ToListAsync());
        await db.SaveChangesAsync();

        var entry = await db.AuditLogs.SingleAsync();
        Assert.Equal("CreateDepartment", entry.Action);
        Assert.Equal("Department", entry.EntityType);
        Assert.Equal(3, entry.EntityId);
        Assert.Equal("Created department Cardiology", entry.Details);
        Assert.Equal("7", entry.ActorName);
        Assert.True(entry.CreatedAt > DateTime.UtcNow.AddMinutes(-1));
    }

    [Fact]
    public async Task LogAsync_WithNobodySignedIn_RecordsUnknown()
    {
        using var db = CreateDbContext();

        await new AuditLogService(db, Caller(null)).LogAsync("SignInFailed", "User", 0, "Failed sign-in");
        await db.SaveChangesAsync();

        Assert.Equal("Unknown", (await db.AuditLogs.SingleAsync()).ActorName);
    }
}
