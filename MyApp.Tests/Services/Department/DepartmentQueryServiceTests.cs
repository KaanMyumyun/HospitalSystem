using Xunit;
using HospitalSystem.Services;
 
public class DepartmentQueryServiceTests : DepartmentTestBase
{
    private DepartmentQueryService CreateService(ApplicationDbContext db, bool isAdmin = true)
        => new(db, CreateCurrentUser(isAdmin));
 
    [Fact]
    public async Task ListDepartmentsAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        db.Departments.AddRange(
            new DepartmentEntity { Id = 1, Department = "Cardiology", IsActive = true },
            new DepartmentEntity { Id = 2, Department = "Neurology", IsActive = false }
        );
        await db.SaveChangesAsync();
        var service = CreateService(db);
 
        var result = await service.ListDepartmentsAsync();
 
        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Data.Count);
        Assert.Contains(result.Data, d => d.Id == 1 && d.Name == "Cardiology" && d.IsActive == true);
        Assert.Contains(result.Data, d => d.Id == 2 && d.Name == "Neurology" && d.IsActive == false);
    }
 
    [Fact]
    public async Task ListDepartmentsAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);
 
        var result = await service.ListDepartmentsAsync();
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Not allowed to list deparments", result.Error);
    }
}
