using HospitalSystem.Services.Auth;
using Xunit;
 
public class LoginServiceTests : AuthTestBase
{
    private LoginService CreateService(ApplicationDbContext db, bool demoEnabled = true)
        => new(db, CreateJwtOptions(), CreateDemoOptions(demoEnabled));
 
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
        Assert.Equal(role.ToString(), result.Role);
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
}
