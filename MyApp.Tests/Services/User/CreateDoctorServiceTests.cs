using Microsoft.EntityFrameworkCore;
using Xunit;
using HospitalSystem.Services;
 
public class CreateDoctorServiceTests : UserTestBase
{
    private CreateDoctorService CreateService(ApplicationDbContext db, bool isAdmin = true)
        => new(db, CreateCurrentUser(isAdmin));
 
    [Fact]
    public async Task CreateDoctorAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        db.Departments.Add(new DepartmentEntity { Id = 1, Department = "Cardiology" });
        db.Users.Add(new UserEntity { Id = 1, Name = "Dr Test", PasswordHash = "hashed", Role = UserRole.FrontDesk });
        await db.SaveChangesAsync();
        var service = CreateService(db);
 
        var result = await service.CreateDoctorAsync(new CreateDoctorDto { UserId = 1, DepartmentId = 1 });
 
        Assert.True(result.IsSuccess);
        var doctor = await db.Doctors.FirstOrDefaultAsync(d => d.UserId == 1);
        Assert.NotNull(doctor);
        Assert.True(doctor!.IsActive);
        Assert.Equal(1, doctor.DepartmentId);
        Assert.Equal(UserRole.Doctor, (await db.Users.FindAsync(1))!.Role);
    }
 
    [Fact]
    public async Task CreateDoctorAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);
 
        var result = await service.CreateDoctorAsync(new CreateDoctorDto { UserId = 1 });
 
        Assert.False(result.IsSuccess);
    }
 
    [Fact]
    public async Task CreateDoctorAsync_UserNotFound_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db);
 
        var result = await service.CreateDoctorAsync(new CreateDoctorDto { UserId = 1000, DepartmentId = 1 });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("User not found", result.Error);
    }
 
    [Fact]
    public async Task CreateDoctorAsync_DepartmentNotFound_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db);
 
        var result = await service.CreateDoctorAsync(new CreateDoctorDto { UserId = 1, DepartmentId = 1000 });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Department not found", result.Error);
    }
 
    [Fact]
    public async Task CreateDoctorAsync_ExistingDoctor_UpdatesAndReactivates()
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db, isDoctorActive: false, userRole: UserRole.Doctor);
        db.Departments.Add(new DepartmentEntity { Id = 2, Department = "Neurology" });
        await db.SaveChangesAsync();
        var service = CreateService(db);
 
        var result = await service.CreateDoctorAsync(new CreateDoctorDto { UserId = 1, DepartmentId = 2 });
 
        Assert.True(result.IsSuccess);
        var doctor = await db.Doctors.FirstOrDefaultAsync(d => d.UserId == 1);
        Assert.True(doctor!.IsActive);
        Assert.Equal(2, doctor.DepartmentId);
    }
}
