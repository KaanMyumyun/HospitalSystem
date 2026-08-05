using Microsoft.EntityFrameworkCore;
using Xunit;
 
public class UserCreationServiceTests : AuthTestBase
{
    private UserCreationService CreateService(ApplicationDbContext db, bool isAdmin = true)
        => new(db, CreateCurrentUser(isAdmin));
 
    [Fact]
    public async Task CreateUserAsync_NotAdmin_Fails()
    {
        using var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);
 
        var result = await service.CreateUserAsync(new CreateUserDto { Name = "NewUser", Password = "Password123" });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("You are not allowed to create a user", result.Error);
    }
 
    [Fact]
    public async Task CreateUserAsync_UserAlreadyExists_Fails()
    {
        using var db = CreateDbContext();
        await SeedUserAsync(db);
        var service = CreateService(db);
 
        var result = await service.CreateUserAsync(new CreateUserDto { Name = "Test", Password = "Password123" });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Name already exists", result.Error);
    }
 
    [Fact]
    public async Task CreateUserAsync_EmptyNameOrPassword_Fails()
    {
        using var db = CreateDbContext();
        var service = CreateService(db);
 
        var result = await service.CreateUserAsync(new CreateUserDto { Name = "", Password = "" });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Name and password are required", result.Error);
    }

    [Fact]
    public async Task CreateUserAsync_ShortPassword_Fails()
    {
        using var db = CreateDbContext();
        var service = CreateService(db);

        var result = await service.CreateUserAsync(new CreateUserDto { Name = "NewUser", Password = "short" });

        Assert.False(result.IsSuccess);
        Assert.Equal("Password must be at least 8 characters long", result.Error);
    }

    [Fact]
    public async Task CreateUserAsync_InvalidName_Fails()
    {
        using var db = CreateDbContext();
        var service = CreateService(db);

        var result = await service.CreateUserAsync(new CreateUserDto { Name = "12 bad", Password = "Password123" });

        Assert.False(result.IsSuccess);
        Assert.Equal("Username must start with a letter and use only letters, numbers, dots, hyphens, or underscores", result.Error);
    }
 
    [Fact]
    public async Task CreateUserAsync_ValidData_Succeeds()
    {
        using var db = CreateDbContext();
        var service = CreateService(db);
 
        var result = await service.CreateUserAsync(new CreateUserDto { Name = "BrandNewUser", Password = "Password123" });
 
        Assert.True(result.IsSuccess);
 
        var saved = await db.Users.FirstOrDefaultAsync(u => u.Name == "BrandNewUser");
        Assert.NotNull(saved);
        Assert.Equal(UserRole.Pending, saved!.Role);
        Assert.NotNull(saved.PasswordHash);
        Assert.NotEqual("Password123", saved.PasswordHash);
    }
}
