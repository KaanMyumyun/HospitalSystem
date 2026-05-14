using Xunit;
using HospitalSystem.Services;
 
public class DepartmentCreationServiceTests : DepartmentTestBase
{
    private DepartmentCreationService CreateService(ApplicationDbContext db, bool isAdmin = true)
        => new(db, CreateCurrentUser(isAdmin));
 
    [Fact]
    public async Task CreateDepartmentAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        await SeedAsync(db);
        var service = CreateService(db);
 
        var result = await service.CreateDepartmentAsync(new CreateDepartmentDto { Name = "DDD" });
 
        Assert.True(result.IsSuccess);
    }
 
    [Fact]
    public async Task CreateDepartmentAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);
 
        var result = await service.CreateDepartmentAsync(new CreateDepartmentDto { Name = "DDD" });
 
        Assert.False(result.IsSuccess);
    }
 
    [Fact]
    public async Task CreateDepartmentAsync_AlreadyExists_Fails()
    {
        var db = CreateDbContext();
        await SeedAsync(db);
        var service = CreateService(db);
 
        var result = await service.CreateDepartmentAsync(new CreateDepartmentDto { Name = "Cardiology" });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Department already exists", result.Error);
    }
}
