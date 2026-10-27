using Xunit;
using HospitalSystem.Services;
using HospitalSystem.Services.Department;

namespace HospitalSystem.Tests;

public class DepartmentStatusServiceTests : DepartmentTestBase
{
    private DepartmentStatusService CreateService(ApplicationDbContext db, bool isAdmin = true)
    {
        var admin = CreateCurrentUser(isAdmin);
        return new(db, admin, new AuditLogService(db, admin));
    }

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
        Assert.Equal("Department not found", result.Error);
        Assert.Equal(FailureKind.NotFound, result.Failure);
    }

    // A request without a status must not deactivate the department by default.
    [Fact]
    public async Task ChangeDepartmentStatusAsync_MissingIsActive_FailsAndChangesNothing()
    {
        var db = CreateDbContext();
        await SeedAsync(db);
        var service = CreateService(db);

        var result = await service.ChangeDepartmentStatusAsync(new ChangeDepartmentStatusDto { DepartmentId = 2 });

        Assert.Equal(FailureKind.Invalid, result.Failure);
        Assert.Equal("Department status is required", result.Error);
        Assert.True((await db.Departments.FindAsync(2))!.IsActive);
    }
}
