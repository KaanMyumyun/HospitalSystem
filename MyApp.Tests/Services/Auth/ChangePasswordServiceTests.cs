using HospitalSystem.Interfaces;
using HospitalSystem.Services.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Moq;

namespace HospitalSystem.Tests;

public class ChangePasswordServiceTests : AuthTestBase
{
    private ChangePasswordService CreateService(ApplicationDbContext db, UserRole role = UserRole.FrontDesk, string userId = "1", TimeProvider? clock = null)
    {
        var mock = new Mock<ICurrentUserService>();
        mock.Setup(x => x.IsInRole(It.IsAny<UserRole>())).Returns<UserRole>(r => r == role);
        mock.Setup(x => x.UserId).Returns(userId);
        return new ChangePasswordService(
            db, mock.Object, new TestAuditLogService(db), new SecurityStampCache(new MemoryCache(new MemoryCacheOptions())), CreateJwtOptions(),
            new PasswordHasher<UserEntity>(), clock ?? TimeProvider.System);
    }

    private static ChangePasswordDto Change(string current = TestPassword, string next = "a-new-password") =>
        new() { CurrentPassword = current, NewPassword = next };

    [Fact]
    public async Task ChangesThePassword_AndReturnsATokenForTheNewStamp()
    {
        using var db = CreateDbContext();
        var user = await SeedUserAsync(db, UserRole.FrontDesk);
        var oldStamp = user.SecurityStamp;

        var result = await CreateService(db).ChangeOwnPasswordAsync(Change());

        Assert.True(result.IsSuccess);
        Assert.NotEqual(oldStamp, user.SecurityStamp);
        Assert.Equal(
            PasswordVerificationResult.Success,
            new PasswordHasher<UserEntity>().VerifyHashedPassword(user, user.PasswordHash, "a-new-password"));
        Assert.NotNull(result.Token);
        Assert.Equal(user.SecurityStamp, ReadValidatedToken(result.Token).FindFirst(SecurityStampClaims.ClaimType)?.Value);
        Assert.Contains(db.AuditLogs, a => a.Action == "ChangePassword" && a.EntityId == user.Id);
    }

    [Fact]
    public async Task WrongCurrentPassword_ChangesNothing_AndIsAudited()
    {
        using var db = CreateDbContext();
        var user = await SeedUserAsync(db, UserRole.FrontDesk);
        var oldHash = user.PasswordHash;

        var result = await CreateService(db).ChangeOwnPasswordAsync(Change(current: "not-my-password"));

        Assert.Equal("The current password is not correct", result.Error);
        Assert.Equal(oldHash, (await db.Users.AsNoTracking().SingleAsync()).PasswordHash);
        Assert.Contains(db.AuditLogs, a => a.Action == "ChangePasswordFailed");
    }

    [Theory]
    [InlineData("short", "Password must be at least 8 characters long")]
    [InlineData(TestPassword, "The new password must be different from the current one")]
    public async Task UnusableNewPassword_IsRefused(string next, string error)
    {
        using var db = CreateDbContext();
        await SeedUserAsync(db, UserRole.FrontDesk);

        var result = await CreateService(db).ChangeOwnPasswordAsync(Change(next: next));

        Assert.Equal(error, result.Error);
    }

    [Fact]
    public async Task DemoAccounts_HaveNoPasswordToChange()
    {
        using var db = CreateDbContext();
        await SeedUserAsync(db, UserRole.DemoAdmin);

        var result = await CreateService(db, UserRole.DemoAdmin).ChangeOwnPasswordAsync(Change());

        Assert.Equal(FailureKind.Forbidden, result.Failure);
    }

    [Fact]
    public async Task WrongCurrentPasswords_CountTowardsTheSignInLock()
    {
        using var db = CreateDbContext();
        await SeedUserAsync(db, UserRole.FrontDesk);
        var now = new DateTimeOffset(2026, 3, 2, 12, 0, 0, TimeSpan.Zero);
        var service = CreateService(db, clock: new FixedClock(now));

        for (var attempt = 0; attempt < 9; attempt++)
            Assert.Equal("The current password is not correct", (await service.ChangeOwnPasswordAsync(Change(current: "wrong-password"))).Error);
        var tenth = await service.ChangeOwnPasswordAsync(Change(current: "wrong-password"));
        var rightPassword = await service.ChangeOwnPasswordAsync(Change());

        Assert.StartsWith("Too many wrong passwords", tenth.Error);
        Assert.False(rightPassword.IsSuccess);
        Assert.StartsWith("Too many wrong passwords", rightPassword.Error);
        Assert.Equal(now.UtcDateTime.AddMinutes(15), (await db.Users.SingleAsync()).LockedUntil);
    }
}
