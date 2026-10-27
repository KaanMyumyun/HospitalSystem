using HospitalSystem.Interfaces;
using HospitalSystem.Services.Department;
using Moq;

namespace HospitalSystem.Tests;

public class DepartmentQueryServiceTests : DepartmentTestBase
{
    private DepartmentQueryService CreateService(ApplicationDbContext db, bool isAdmin = true)
        => new(db, CreateCurrentUser(isAdmin));

    private static DepartmentQueryService CreateService(ApplicationDbContext db, UserRole role)
    {
        var caller = new Mock<ICurrentUserService>();
        caller.Setup(x => x.IsInRole(It.IsAny<UserRole>())).Returns<UserRole>(r => r == role);
        return new(db, caller.Object);
    }

    [Fact]
    public async Task ListDepartmentsAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        db.Departments.AddRange(
            new DepartmentEntity { Id = 1, Name = "Cardiology", IsActive = true },
            new DepartmentEntity { Id = 2, Name = "Neurology", IsActive = false }
        );
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var result = await service.ListDepartmentsAsync();

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal(2, result.Data.Count);
        Assert.Contains(result.Data, d => d.Id == 1 && d.Name == "Cardiology" && d.IsActive == true);
        Assert.Contains(result.Data, d => d.Id == 2 && d.Name == "Neurology" && d.IsActive == false);
    }

    // The admin and reception screens both list departments, for real and
    // demo accounts alike.
    [Theory]
    [InlineData(UserRole.Admin)]
    [InlineData(UserRole.FrontDesk)]
    [InlineData(UserRole.DemoAdmin)]
    [InlineData(UserRole.DemoFrontDesk)]
    public async Task ListDepartmentsAsync_EveryRoleWithAScreenThatShowsThem_Succeeds(UserRole role)
    {
        var db = CreateDbContext();
        await SeedAsync(db);

        var result = await CreateService(db, role).ListDepartmentsAsync();

        Assert.True(result.IsSuccess);
        Assert.Equal(["Cardiology", "Emergency"], result.Data!.Select(d => d.Name).Order());
    }

    [Theory]
    [InlineData(UserRole.Doctor)]
    [InlineData(UserRole.Pending)]
    public async Task ListDepartmentsAsync_OtherRoles_AreForbidden(UserRole role)
    {
        var db = CreateDbContext();
        await SeedAsync(db);

        var result = await CreateService(db, role).ListDepartmentsAsync();

        Assert.Equal(FailureKind.Forbidden, result.Failure);
        Assert.Null(result.Data);
    }

    [Fact]
    public async Task ListDepartmentsAsync_WithNoDepartments_IsAnEmptyList()
    {
        var db = CreateDbContext();

        var result = await CreateService(db).ListDepartmentsAsync();

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Data!);
    }

    // A request the client has abandoned stops its query.
    [Fact]
    public async Task ListDepartmentsAsync_StopsWhenTheRequestIsCancelled()
    {
        var db = CreateDbContext();
        await SeedAsync(db);
        using var cancelled = new CancellationTokenSource();
        await cancelled.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => CreateService(db).ListDepartmentsAsync(cancelled.Token));
    }

    [Fact]
    public async Task ListDepartmentsAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);

        var result = await service.ListDepartmentsAsync();

        Assert.False(result.IsSuccess);
        Assert.Equal("Not allowed to list departments", result.Error);
        Assert.Equal(FailureKind.Forbidden, result.Failure);
    }
}
