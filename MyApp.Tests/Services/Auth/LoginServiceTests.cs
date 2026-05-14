using Xunit;
 
public class LoginServiceTests : AuthTestBase
{
    private LoginService CreateService(ApplicationDbContext db)
        => new(db, CreateJwtOptions());
 
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
}
