using HospitalSystem.Interfaces;
using HospitalSystem.Services;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace HospitalSystem.Tests;

public class AuditLogQueryServiceTests
{
    private static ApplicationDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static AuditLogQueryService CreateService(ApplicationDbContext db, UserRole role = UserRole.Admin)
    {
        var mock = new Mock<ICurrentUserService>();
        mock.Setup(x => x.IsInRole(It.IsAny<UserRole>())).Returns<UserRole>(r => r == role);
        return new AuditLogQueryService(db, mock.Object);
    }

    private static async Task SeedAsync(ApplicationDbContext db)
    {
        db.Users.Add(new UserEntity { Id = 7, Name = "alice", PasswordHash = "x", Role = UserRole.Admin });
        db.AuditLogs.AddRange(
            Entry(1, "CreateUser", "Created user bob", 7, "alice", new DateTime(2026, 10, 1, 9, 0, 0, DateTimeKind.Utc)),
            Entry(2, "SignInFailed", "Failed sign-in with an unknown username", null, "Unknown", new DateTime(2026, 10, 2, 9, 0, 0, DateTimeKind.Utc)),
            // As a release from before ActorUserId writes it: the id in ActorName.
            Entry(3, "ResetPassword", "Password reset for user bob", null, "7", new DateTime(2026, 10, 3, 9, 0, 0, DateTimeKind.Utc)));
        await db.SaveChangesAsync();
    }

    private static AuditLogEntity Entry(int id, string action, string details, int? actorId, string actor, DateTime at) => new()
    {
        Id = id, Action = action, EntityType = "User", EntityId = 1, Details = details, ActorUserId = actorId, ActorName = actor, CreatedAt = at
    };

    [Fact]
    public async Task List_IsNewestFirst_WithActorsByName()
    {
        using var db = CreateDbContext();
        await SeedAsync(db);

        var result = await CreateService(db).ListAsync(new AuditLogQueryDto());

        Assert.NotNull(result.Data);
        Assert.Equal([3, 2, 1], result.Data.Items.Select(e => e.Id));
        Assert.Equal(["alice", "Unknown", "alice"], result.Data.Items.Select(e => e.Actor));
        Assert.Equal(3, result.Data.TotalCount);
    }

    [Fact]
    public async Task List_SearchesActionsAndDetails()
    {
        using var db = CreateDbContext();
        await SeedAsync(db);

        var result = await CreateService(db).ListAsync(new AuditLogQueryDto { Search = "BOB" });

        Assert.NotNull(result.Data);
        Assert.Equal([3, 1], result.Data.Items.Select(e => e.Id));
    }

    // Entries name users, and demo admins may not list users.
    [Theory]
    [InlineData(UserRole.DemoAdmin)]
    [InlineData(UserRole.FrontDesk)]
    public async Task List_IsOnlyForAdmins(UserRole role)
    {
        using var db = CreateDbContext();
        await SeedAsync(db);

        var result = await CreateService(db, role).ListAsync(new AuditLogQueryDto());

        Assert.Equal(FailureKind.Forbidden, result.Failure);
    }
}
