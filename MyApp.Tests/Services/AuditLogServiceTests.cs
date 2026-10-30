using HospitalSystem.Interfaces;
using HospitalSystem.Services;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace HospitalSystem.Tests;

public class AuditLogServiceTests
{
    private static ApplicationDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static ICurrentUserService Caller(string? userId, string? userName = null)
    {
        var mock = new Mock<ICurrentUserService>();
        mock.Setup(x => x.UserId).Returns(userId);
        mock.Setup(x => x.UserName).Returns(userName);
        return mock.Object;
    }

    [Fact]
    public async Task LogAsync_AddsAnEntryThatTheCallersSaveWrites()
    {
        using var db = CreateDbContext();
        var service = new AuditLogService(db, Caller("7", "alice"));

        await service.LogAsync("CreateDepartment", "Department", 3, "Created department Cardiology");
        Assert.Empty(await db.AuditLogs.ToListAsync());
        await db.SaveChangesAsync();

        var entry = await db.AuditLogs.SingleAsync();
        Assert.Equal("CreateDepartment", entry.Action);
        Assert.Equal("Department", entry.EntityType);
        Assert.Equal(3, entry.EntityId);
        Assert.Equal("Created department Cardiology", entry.Details);
        Assert.Equal(7, entry.ActorUserId);
        Assert.Equal("alice", entry.ActorName);
        Assert.True(entry.CreatedAt > DateTime.UtcNow.AddMinutes(-1));
    }

    [Fact]
    public async Task LogAsync_WithoutAUsernameInTheToken_LooksItUp()
    {
        using var db = CreateDbContext();
        db.Users.Add(new UserEntity { Id = 7, Name = "alice", PasswordHash = "x", Role = UserRole.Admin });
        await db.SaveChangesAsync();

        await new AuditLogService(db, Caller("7")).LogAsync("ResetPassword", "User", 2, "Password reset for user bob");
        await db.SaveChangesAsync();

        var entry = await db.AuditLogs.SingleAsync();
        Assert.Equal(7, entry.ActorUserId);
        Assert.Equal("alice", entry.ActorName);
    }

    [Fact]
    public async Task LogAsync_WithNobodySignedIn_RecordsUnknown()
    {
        using var db = CreateDbContext();

        await new AuditLogService(db, Caller(null)).LogAsync("SignInFailed", "User", 0, "Failed sign-in");
        await db.SaveChangesAsync();

        var entry = await db.AuditLogs.SingleAsync();
        Assert.Null(entry.ActorUserId);
        Assert.Equal("Unknown", entry.ActorName);
    }
}
