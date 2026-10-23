using Xunit;
using Microsoft.EntityFrameworkCore;
using HospitalSystem.Services;
using HospitalSystem.Services.Department;

namespace HospitalSystem.Tests;

public class DepartmentCreationServiceTests : DepartmentTestBase
{
    private DepartmentCreationService CreateService(ApplicationDbContext db, bool isAdmin = true)
        => new(db, CreateCurrentUser(isAdmin), new TestAuditLogService(db));

    [Fact]
    public async Task CreateDepartmentAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        await SeedAsync(db);
        var service = CreateService(db);

        var result = await service.CreateDepartmentAsync(new CreateDepartmentDto { Name = "DDD" });

        Assert.True(result.IsSuccess);
        var department = await db.Departments.SingleAsync(d => d.Department == "DDD");
        Assert.Contains(db.AuditLogs, a => a.Action == "CreateDepartment" && a.EntityId == department.Id);
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
        Assert.Equal(FailureKind.Conflict, result.Failure);
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

    [Theory]
    [InlineData("cardiology")]
    [InlineData("  CARDIOLOGY ")]
    public async Task CreateDepartmentAsync_SameNameInAnotherCase_IsAConflict(string name)
    {
        var db = CreateDbContext();
        await SeedAsync(db);
        var service = CreateService(db);

        var result = await service.CreateDepartmentAsync(new CreateDepartmentDto { Name = name });

        Assert.Equal(FailureKind.Conflict, result.Failure);
        Assert.Equal(2, await db.Departments.CountAsync());
    }

    [Fact]
    public async Task CreateDepartmentAsync_TrimsTheName()
    {
        var db = CreateDbContext();
        var service = CreateService(db);

        var result = await service.CreateDepartmentAsync(new CreateDepartmentDto { Name = "  Neurology  " });

        Assert.True(result.IsSuccess);
        Assert.Equal("Neurology", (await db.Departments.SingleAsync()).Department);
    }

    [Fact]
    public async Task CreateDepartmentAsync_BlankName_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db);

        var result = await service.CreateDepartmentAsync(new CreateDepartmentDto { Name = "    " });

        Assert.Equal(FailureKind.Invalid, result.Failure);
        Assert.Equal("Department name is required", result.Error);
        Assert.Empty(db.Departments);
    }
}
