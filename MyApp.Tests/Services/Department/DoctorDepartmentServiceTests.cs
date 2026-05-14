using Xunit;
using HospitalSystem.Services;
 
public class DoctorDepartmentServiceTests : DepartmentTestBase
{
    private DoctorDepartmentService CreateService(ApplicationDbContext db, bool isAdmin = true)
        => new(db, CreateCurrentUser(isAdmin));
 
    [Fact]
    public async Task ChangeDoctorDepartmentAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        await SeedAsync(db, isDoctorActive: true);
        var service = CreateService(db);
 
        var result = await service.ChangeDoctorDepartmentAsync(new ChangeDoctorDepartmentDto { DoctorId = 1, DepartmentId = 2 });
 
        Assert.True(result.IsSuccess);
    }
 
    [Fact]
    public async Task ChangeDoctorDepartmentAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);
 
        var result = await service.ChangeDoctorDepartmentAsync(new ChangeDoctorDepartmentDto { DoctorId = 1, DepartmentId = 2 });
 
        Assert.False(result.IsSuccess);
    }
 
    [Fact]
    public async Task ChangeDoctorDepartmentAsync_DoctorNotFound_Fails()
    {
        var db = CreateDbContext();
        await SeedAsync(db, isDoctorActive: true);
        var service = CreateService(db);
 
        var result = await service.ChangeDoctorDepartmentAsync(new ChangeDoctorDepartmentDto { DoctorId = 10000, DepartmentId = 2 });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Doctor doesnt exist ", result.Error);
    }
 
    [Fact]
    public async Task ChangeDoctorDepartmentAsync_DoctorInactive_Fails()
    {
        var db = CreateDbContext();
        await SeedAsync(db, isDoctorActive: false);
        var service = CreateService(db);
 
        var result = await service.ChangeDoctorDepartmentAsync(new ChangeDoctorDepartmentDto { DoctorId = 1, DepartmentId = 2 });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("This Doctor isnt active", result.Error);
    }
 
    [Fact]
    public async Task ChangeDoctorDepartmentAsync_DepartmentNotFound_Fails()
    {
        var db = CreateDbContext();
        await SeedAsync(db, isDoctorActive: true);
        var service = CreateService(db);
 
        var result = await service.ChangeDoctorDepartmentAsync(new ChangeDoctorDepartmentDto { DoctorId = 1, DepartmentId = 1000 });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Department doesnt exist", result.Error);
    }
 
    [Fact]
    public async Task ChangeDoctorDepartmentAsync_DepartmentInactive_Fails()
    {
        var db = CreateDbContext();
        await SeedAsync(db, isDoctorActive: true);
        var service = CreateService(db);
 
        var result = await service.ChangeDoctorDepartmentAsync(new ChangeDoctorDepartmentDto { DoctorId = 1, DepartmentId = 1 });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("This Deparment isnt active", result.Error);
    }
 
    [Fact]
    public async Task ChangeDoctorDepartmentAsync_AlreadyInDepartment_Fails()
    {
        var db = CreateDbContext();
        await SeedAsync(db, isDoctorActive: true);
        var service = CreateService(db);
 
        var result = await service.ChangeDoctorDepartmentAsync(new ChangeDoctorDepartmentDto { DoctorId = 2, DepartmentId = 2 });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Already in that department", result.Error);
    }
}
