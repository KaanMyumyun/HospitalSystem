using Xunit;
using Microsoft.EntityFrameworkCore;
using HospitalSystem.Services;
using HospitalSystem.Services.Deparment;

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

    [Fact]
    public async Task CreateDepartmentAsync_NewDepartment_IsActiveAndAcceptsDoctorAssignment()
    {
        var db = CreateDbContext();
        await SeedAsync(db, isDoctorActive: true);
        var service = CreateService(db);

        var createResult = await service.CreateDepartmentAsync(new CreateDepartmentDto { Name = "DDD" });
        Assert.True(createResult.IsSuccess);

        var newDepartment = await db.Departments.SingleAsync(d => d.Department == "DDD");
        Assert.True(newDepartment.IsActive);

        var assignmentService = new DoctorDepartmentService(db, CreateCurrentUser(), new TestAuditLogService(db));
        var assignResult = await assignmentService.ChangeDoctorDepartmentAsync(
            new ChangeDoctorDepartmentDto { DoctorId = 1, DepartmentId = newDepartment.Id });

        Assert.True(assignResult.IsSuccess);
    }
}
