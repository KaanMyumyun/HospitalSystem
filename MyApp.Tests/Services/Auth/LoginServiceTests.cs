using System.Security.Claims;
using HospitalSystem.Services.Auth;
using Xunit;

namespace HospitalSystem.Tests;
 
public class LoginServiceTests : AuthTestBase
{
    private LoginService CreateService(ApplicationDbContext db, bool demoEnabled = true)
        => new(db, CreateJwtOptions(), CreateDemoOptions(demoEnabled), new TestAuditLogService(db));
 
    [Fact]
    public async Task LoginAsync_CorrectCredentials_Succeeds()
    {
        var db = CreateDbContext();
        await SeedUserAsync(db);
        var service = CreateService(db);
 
        var result = await service.LoginAsync(new LoginDto { Name = "Test", Password = TestPassword });
 
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Token);
    }
 
    [Fact]
    public async Task LoginAsync_WrongPassword_Fails()
    {
        var db = CreateDbContext();
        await SeedUserAsync(db);
        var service = CreateService(db);
 
        var result = await service.LoginAsync(new LoginDto { Name = "Test", Password = "wrongpassword" });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Invalid credentials", result.Error);
    }
 
    [Fact]
    public async Task LoginAsync_WrongName_Fails()
    {
        var db = CreateDbContext();
        await SeedUserAsync(db);
        var service = CreateService(db);
 
        var result = await service.LoginAsync(new LoginDto { Name = "Nobody", Password = TestPassword });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Invalid credentials", result.Error);
    }
 
    [Fact]
    public async Task LoginAsync_EmptyCredentials_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db);
 
        var result = await service.LoginAsync(new LoginDto { Name = "", Password = "" });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Invalid credentials", result.Error);
    }

    [Fact]
    public async Task LoginAsync_DemoAccountWithCorrectPassword_Fails()
    {
        var db = CreateDbContext();
        await SeedUserAsync(db, UserRole.DemoAdmin, "DemoAdmin");
        var service = CreateService(db);

        var result = await service.LoginAsync(new LoginDto { Name = "DemoAdmin", Password = TestPassword });

        Assert.False(result.IsSuccess);
        Assert.Equal("Invalid credentials", result.Error);
    }

    [Fact]
    public async Task LoginAsync_PendingUser_FailsAwaitingApproval()
    {
        var db = CreateDbContext();
        await SeedUserAsync(db, UserRole.Pending, "Newcomer");
        var service = CreateService(db);

        var result = await service.LoginAsync(new LoginDto { Name = "Newcomer", Password = TestPassword });

        Assert.False(result.IsSuccess);
        Assert.Null(result.Token);
        Assert.Equal("Account awaiting approval", result.Error);
    }

    [Fact]
    public async Task LoginAsync_PendingUserWrongPassword_FailsAsInvalidCredentials()
    {
        var db = CreateDbContext();
        await SeedUserAsync(db, UserRole.Pending, "Newcomer");
        var service = CreateService(db);

        var result = await service.LoginAsync(new LoginDto { Name = "Newcomer", Password = "wrong" });

        Assert.False(result.IsSuccess);
        Assert.Equal("Invalid credentials", result.Error);
    }

    [Theory]
    [InlineData(UserRole.DemoAdmin, "DemoAdmin")]
    [InlineData(UserRole.DemoFrontDesk, "DemoReception")]
    public async Task DemoLoginAsync_Enabled_SignsInConfiguredAccount(UserRole role, string name)
    {
        var db = CreateDbContext();
        await SeedUserAsync(db, role, name);
        var service = CreateService(db);

        var result = await service.DemoLoginAsync(role);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Token);
        Assert.Equal(role, result.Role);
    }

    [Fact]
    public async Task DemoLoginAsync_Disabled_Fails()
    {
        var db = CreateDbContext();
        await SeedUserAsync(db, UserRole.DemoAdmin, "DemoAdmin");
        var service = CreateService(db, demoEnabled: false);

        var result = await service.DemoLoginAsync(UserRole.DemoAdmin);

        Assert.False(result.IsSuccess);
        Assert.Equal("Demo login is not available", result.Error);
    }

    [Fact]
    public async Task DemoLoginAsync_NonDemoRole_Fails()
    {
        var db = CreateDbContext();
        await SeedUserAsync(db, UserRole.Admin);
        var service = CreateService(db);

        var result = await service.DemoLoginAsync(UserRole.Admin);

        Assert.False(result.IsSuccess);
        Assert.Equal("Invalid credentials", result.Error);
    }

    [Fact]
    public async Task DemoLoginAsync_ConfiguredAccountWithRealRole_Fails()
    {
        var db = CreateDbContext();
        await SeedUserAsync(db, UserRole.Admin, "DemoAdmin");
        var service = CreateService(db);

        var result = await service.DemoLoginAsync(UserRole.DemoAdmin);

        Assert.False(result.IsSuccess);
        Assert.Equal("Invalid credentials", result.Error);
    }

    [Fact]
    public async Task DemoLoginAsync_UnconfiguredAccountWithDemoRole_Fails()
    {
        var db = CreateDbContext();
        await SeedUserAsync(db, UserRole.DemoAdmin, "RealPerson");
        var service = CreateService(db);

        var result = await service.DemoLoginAsync(UserRole.DemoAdmin);

        Assert.False(result.IsSuccess);
        Assert.Equal("Invalid credentials", result.Error);
    }

    [Fact]
    public async Task LoginAsync_Token_CarriesSecurityStampClaim()
    {
        var db = CreateDbContext();
        var user = await SeedUserAsync(db);
        var service = CreateService(db);

        var result = await service.LoginAsync(new LoginDto { Name = "Test", Password = TestPassword });

        Assert.True(result.IsSuccess);
        var principal = ReadValidatedToken(result.Token!);
        Assert.Equal(user.SecurityStamp, principal.FindFirst(SecurityStampClaims.ClaimType)?.Value);
    }

    [Fact]
    public async Task LoginAsync_Token_CarriesUserIdAndRole()
    {
        var db = CreateDbContext();
        var user = await SeedUserAsync(db, UserRole.FrontDesk, "Reception");
        var service = CreateService(db);

        var result = await service.LoginAsync(new LoginDto { Name = "Reception", Password = TestPassword });

        Assert.True(result.IsSuccess);
        var principal = ReadValidatedToken(result.Token!);
        Assert.Equal(user.Id.ToString(), principal.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        Assert.Equal(UserRole.FrontDesk.ToString(), principal.FindFirst(ClaimTypes.Role)?.Value);
    }

    [Fact]
    public async Task DemoLoginAsync_Token_CarriesSecurityStampClaim()
    {
        var db = CreateDbContext();
        var user = await SeedUserAsync(db, UserRole.DemoAdmin, "DemoAdmin");
        var service = CreateService(db);

        var result = await service.DemoLoginAsync(UserRole.DemoAdmin);

        Assert.True(result.IsSuccess);
        var principal = ReadValidatedToken(result.Token!);
        Assert.Equal(user.SecurityStamp, principal.FindFirst(SecurityStampClaims.ClaimType)?.Value);
    }

    [Fact]
    public async Task LoginAsync_AfterStampRotation_OldTokenStampNoLongerMatchesTheUser()
    {
        var db = CreateDbContext();
        var user = await SeedUserAsync(db);
        var service = CreateService(db);

        var before = await service.LoginAsync(new LoginDto { Name = "Test", Password = TestPassword });

        user.SecurityStamp = Guid.NewGuid().ToString();
        await db.SaveChangesAsync();

        var after = await service.LoginAsync(new LoginDto { Name = "Test", Password = TestPassword });

        var staleStamp = ReadValidatedToken(before.Token!).FindFirst(SecurityStampClaims.ClaimType)?.Value;
        var freshStamp = ReadValidatedToken(after.Token!).FindFirst(SecurityStampClaims.ClaimType)?.Value;

        Assert.NotEqual(user.SecurityStamp, staleStamp);
        Assert.Equal(user.SecurityStamp, freshStamp);
    }

    [Theory]
    [InlineData("test")]
    [InlineData("TEST")]
    [InlineData("  Test ")]
    public async Task LoginAsync_NameInAnotherCaseOrWithSpaces_Succeeds(string name)
    {
        using var db = CreateDbContext();
        await SeedUserAsync(db);
        var service = CreateService(db);

        var result = await service.LoginAsync(new LoginDto { Name = name, Password = TestPassword });

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_IsAuditedAgainstTheUser()
    {
        using var db = CreateDbContext();
        var user = await SeedUserAsync(db);
        var service = CreateService(db);

        await service.LoginAsync(new LoginDto { Name = "Test", Password = "wrongpassword" });

        var entry = Assert.Single(db.AuditLogs);
        Assert.Equal("SignInFailed", entry.Action);
        Assert.Equal(user.Id, entry.EntityId);
        Assert.Contains("wrong password", entry.Details);
    }

    // People sometimes type their password into the username field, so an
    // unknown username is not written to the audit log.
    [Fact]
    public async Task LoginAsync_UnknownName_IsAuditedWithoutTheTypedName()
    {
        using var db = CreateDbContext();
        await SeedUserAsync(db);
        var service = CreateService(db);

        await service.LoginAsync(new LoginDto { Name = "my-secret-password", Password = "whatever" });

        var entry = Assert.Single(db.AuditLogs);
        Assert.Equal("SignInFailed", entry.Action);
        Assert.Equal(0, entry.EntityId);
        Assert.DoesNotContain("my-secret-password", entry.Details);
    }

    [Theory]
    [InlineData(UserRole.Pending, "account awaiting approval")]
    [InlineData(UserRole.DemoAdmin, "demo accounts have no password sign-in")]
    public async Task LoginAsync_RefusedRole_IsAudited(UserRole role, string reason)
    {
        using var db = CreateDbContext();
        await SeedUserAsync(db, role);
        var service = CreateService(db);

        var result = await service.LoginAsync(new LoginDto { Name = "Test", Password = TestPassword });

        Assert.False(result.IsSuccess);
        Assert.Contains(reason, Assert.Single(db.AuditLogs).Details);
    }

    [Fact]
    public async Task LoginAsync_Success_WritesNoAuditEntry()
    {
        using var db = CreateDbContext();
        await SeedUserAsync(db);
        var service = CreateService(db);

        await service.LoginAsync(new LoginDto { Name = "Test", Password = TestPassword });

        Assert.Empty(db.AuditLogs);
    }

    [Fact]
    public async Task DemoLoginAsync_ConfiguredNameInAnotherCase_Succeeds()
    {
        using var db = CreateDbContext();
        await SeedUserAsync(db, UserRole.DemoFrontDesk, "demoreception");
        var service = CreateService(db);

        var result = await service.DemoLoginAsync(UserRole.DemoFrontDesk);

        Assert.True(result.IsSuccess);
    }
}
