using Xunit;
using HospitalSystem.Services;
 
public class UserQueryServiceTests : UserTestBase
{
    private UserQueryService CreateService(ApplicationDbContext db, bool isAdmin = true, bool isFrontDesk = false)
        => new(db, CreateCurrentUser(isAdmin, isFrontDesk));
 
    [Fact]
    public async Task ListUsersAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        db.Users.AddRange(
            new UserEntity { Id = 1, Name = "Alice", Role = UserRole.Doctor, PasswordHash = "hashed" },
            new UserEntity { Id = 2, Name = "Bob", Role = UserRole.FrontDesk, PasswordHash = "hashed" }
        );
        await db.SaveChangesAsync();
        var service = CreateService(db);
 
        var result = await service.ListUsersAsync();
 
        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Data.Count);
        Assert.Contains(result.Data, u => u.UserId == 1 && u.UserName == "Alice" && u.Role == UserRole.Doctor);
        Assert.Contains(result.Data, u => u.UserId == 2 && u.UserName == "Bob" && u.Role == UserRole.FrontDesk);
    }
 
    [Fact]
    public async Task ListUsersAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);
 
        var result = await service.ListUsersAsync();
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Not allowed to list users", result.Error);
    }
 
    [Fact]
    public async Task ListDoctorsAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        db.Departments.AddRange(
            new DepartmentEntity { Id = 1, Department = "Cardiology" },
            new DepartmentEntity { Id = 2, Department = "Neurology" }
        );
        db.Users.AddRange(
            new UserEntity { Id = 1, Name = "Alice", Role = UserRole.Doctor, PasswordHash = "hashed" },
            new UserEntity { Id = 2, Name = "Bob", Role = UserRole.Doctor, PasswordHash = "hashed" }
        );
        db.Doctors.AddRange(
            new DoctorEntity { Id = 1, UserId = 1, DepartmentId = 1, IsActive = true },
            new DoctorEntity { Id = 2, UserId = 2, DepartmentId = 2, IsActive = false }
        );
        await db.SaveChangesAsync();
        var service = CreateService(db);
 
        var result = await service.ListDoctorsAsync();
 
        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Data.Count);
        Assert.Contains(result.Data, d => d.UserId == 1 && d.Name == "Alice" && d.IsActive == true);
        Assert.Contains(result.Data, d => d.UserId == 2 && d.Name == "Bob" && d.IsActive == false);
    }
 
    [Fact]
    public async Task ListDoctorsAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);
 
        var result = await service.ListDoctorsAsync();
 
        Assert.False(result.IsSuccess);
        Assert.Equal("You are not allowed to list doctors", result.Error);
    }
 
    [Fact]
    public async Task ListDoctorsAsync_FrontDesk_Succeeds()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false, isFrontDesk: true);
 
        var result = await service.ListDoctorsAsync();
 
        Assert.True(result.IsSuccess);
    }
}
