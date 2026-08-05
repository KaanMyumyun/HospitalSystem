using Microsoft.EntityFrameworkCore;
using Xunit;
using HospitalSystem.Services;
 
public class ChangeRoleServiceTests : UserTestBase
{
    private ChangeRoleService CreateService(ApplicationDbContext db, bool isAdmin = true)
        => new(db, CreateCurrentUser(isAdmin), new TestAuditLogService(db));
 
    [Fact]
    public async Task ChangeRoleAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db, isDoctorActive: false);
        var service = CreateService(db);
 
        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 1, NewRole = UserRole.FrontDesk });
 
        Assert.True(result.IsSuccess);
        Assert.Equal(UserRole.FrontDesk, (await db.Users.FindAsync(1))!.Role);
    }
 
    [Fact]
    public async Task ChangeRoleAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);
 
        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 1, NewRole = UserRole.FrontDesk });
 
        Assert.False(result.IsSuccess);
    }
 
    [Fact]
    public async Task ChangeRoleAsync_UserNotFound_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db);
 
        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 1000, NewRole = UserRole.Doctor });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("User not found", result.Error);
    }
 
    [Fact]
    public async Task ChangeRoleAsync_SameRole_Fails()
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db);
        var service = CreateService(db);
 
        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 1, NewRole = UserRole.Doctor });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("User already has this role", result.Error);
    }
 
    [Fact]
    public async Task ChangeRoleAsync_InvalidEnum_Fails()
    {
        var db = CreateDbContext();
        db.Users.Add(new UserEntity { Id = 1, Name = "Dr Test", PasswordHash = "hashed", Role = UserRole.Doctor });
        await db.SaveChangesAsync();
        var service = CreateService(db);
 
        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 1, NewRole = (UserRole)999 });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Invalid role", result.Error);
    }
 
    [Fact]
    public async Task ChangeRoleAsync_PendingRole_Fails()
    {
        var db = CreateDbContext();
        db.Users.Add(new UserEntity { Id = 1, Name = "Dr Test", PasswordHash = "hashed", Role = UserRole.Doctor });
        await db.SaveChangesAsync();
        var service = CreateService(db);
 
        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 1, NewRole = UserRole.Pending });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Invalid role", result.Error);
    }
 
    [Fact]
    public async Task ChangeRoleAsync_ToDoctor_CreatesDoctorEntity()
    {
        var db = CreateDbContext();
        db.Users.Add(new UserEntity { Id = 1, Name = "Regular User", Role = UserRole.FrontDesk, PasswordHash = "hash" });
        await db.SaveChangesAsync();
        var service = CreateService(db);
 
        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 1, NewRole = UserRole.Doctor });
 
        Assert.True(result.IsSuccess);
        var doctor = await db.Doctors.FirstOrDefaultAsync(d => d.UserId == 1);
        Assert.NotNull(doctor);
        Assert.False(doctor!.IsActive);
        Assert.Equal(1, doctor.DepartmentId);
    }
 
    [Fact]
    public async Task ChangeRoleAsync_AwayFromDoctor_DeactivatesDoctor()
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db, isDoctorActive: true, userRole: UserRole.Doctor);
        var service = CreateService(db);
 
        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 1, NewRole = UserRole.FrontDesk });
 
        Assert.True(result.IsSuccess);
        var doctor = await db.Doctors.FirstOrDefaultAsync(d => d.UserId == 1);
        Assert.NotNull(doctor);
        Assert.False(doctor!.IsActive);
    }
}
