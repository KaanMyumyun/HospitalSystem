using Xunit;
using HospitalSystem.Services;
 
public class DepartmentStatusServiceTests : DepartmentTestBase
{
    private DepartmentStatusService CreateService(ApplicationDbContext db, bool isAdmin = true)
        => new(db, CreateCurrentUser(isAdmin));
 
    [Fact]
    public async Task ChangeDepartmentStatusAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        await SeedAsync(db, isDoctorActive: true);
        var service = CreateService(db);
 
        var result = await service.ChangeDepartmentStatusAsync(new ChangeDepartmentStatusDto { DepartmentId = 1, IsActive = true });
 
        Assert.True(result.IsSuccess);
        Assert.True(db.Departments.First().IsActive);
    }
 
    [Fact]
    public async Task ChangeDepartmentStatusAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);
 
        var result = await service.ChangeDepartmentStatusAsync(new ChangeDepartmentStatusDto { DepartmentId = 1, IsActive = true });
 
        Assert.False(result.IsSuccess);
    }
 
    [Fact]
    public async Task ChangeDepartmentStatusAsync_DepartmentNotFound_Fails()
    {
        var db = CreateDbContext();
        await SeedAsync(db);
        var service = CreateService(db);
 
        var result = await service.ChangeDepartmentStatusAsync(new ChangeDepartmentStatusDto { DepartmentId = 999, IsActive = true });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Department doesnt exist", result.Error);
    }
}
