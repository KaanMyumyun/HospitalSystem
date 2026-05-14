using Xunit;
using HospitalSystem.Services;
 
public class ResetPasswordServiceTests : UserTestBase
{
    private ResetPasswordService CreateService(ApplicationDbContext db, bool isAdmin = true)
        => new(db, CreateCurrentUser(isAdmin));
 
    [Fact]
    public async Task ResetPasswordAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db);
        var service = CreateService(db);
 
        var result = await service.ResetPasswordAsync(new ResetPasswordDto { UserId = 1, NewPassword = "newpassword" });
 
        Assert.True(result.IsSuccess);
        Assert.NotEqual("hashed", (await db.Users.FindAsync(1))!.PasswordHash);
    }
 
    [Fact]
    public async Task ResetPasswordAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);
 
        var result = await service.ResetPasswordAsync(new ResetPasswordDto { UserId = 1, NewPassword = "newpassword" });
 
        Assert.False(result.IsSuccess);
    }
 
    [Fact]
    public async Task ResetPasswordAsync_EmptyPassword_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db);
 
        var result = await service.ResetPasswordAsync(new ResetPasswordDto { UserId = 1, NewPassword = "" });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("No password entered", result.Error);
    }
 
    [Fact]
    public async Task ResetPasswordAsync_UserNotFound_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db);
 
        var result = await service.ResetPasswordAsync(new ResetPasswordDto { UserId = 1000, NewPassword = "newpassword" });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("User not found", result.Error);
    }
}
