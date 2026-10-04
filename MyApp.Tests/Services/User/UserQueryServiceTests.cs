using Moq;
using HospitalSystem.Interfaces;
using Xunit;
using HospitalSystem.Services;
using HospitalSystem.Services.User;

namespace HospitalSystem.Tests;
 
public class UserQueryServiceTests : UserTestBase
{
    private UserQueryService CreateService(ApplicationDbContext db, bool isAdmin = true, bool isFrontDesk = false)
        => new(db, CreateCurrentUser(isAdmin, isFrontDesk));

    private static async Task SeedUsersAsync(ApplicationDbContext db, params (string Name, UserRole Role)[] users)
    {
        var id = 1;
        foreach (var (name, role) in users)
            db.Users.Add(new UserEntity { Id = id++, Name = name, Role = role, PasswordHash = "hashed" });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task ListUsersAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        db.Users.AddRange(
            new UserEntity { Id = 1, Name = "Alice", Role = UserRole.Doctor, PasswordHash = "hashed" },
            new UserEntity { Id = 2, Name = "Bob", Role = UserRole.FrontDesk, PasswordHash = "hashed" }
        );
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var result = await service.ListUsersAsync(new UserQueryDto());

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Data.Items.Count);
        Assert.Equal(2, result.Data.TotalCount);
        Assert.Contains(result.Data.Items, u => u.UserId == 1 && u.UserName == "Alice" && u.Role == UserRole.Doctor);
        Assert.Contains(result.Data.Items, u => u.UserId == 2 && u.UserName == "Bob" && u.Role == UserRole.FrontDesk);
    }

    [Fact]
    public async Task ListUsersAsync_PagesInNameOrder()
    {
        var db = CreateDbContext();
        await SeedUsersAsync(db,
            ("Eve", UserRole.FrontDesk), ("Carol", UserRole.Doctor), ("Alice", UserRole.Admin),
            ("Dave", UserRole.Doctor), ("Bob", UserRole.Pending));
        var service = CreateService(db);

        var result = await service.ListUsersAsync(new UserQueryDto { Page = 2, PageSize = 2 });

        Assert.True(result.IsSuccess);
        Assert.Equal(new[] { "Carol", "Dave" }, result.Data.Items.Select(u => u.UserName));
        Assert.Equal(5, result.Data.TotalCount);
        Assert.Equal(2, result.Data.Page);
        Assert.Equal(2, result.Data.PageSize);
    }

    [Fact]
    public async Task ListUsersAsync_FullFirstPage_CountsEveryMatch()
    {
        var db = CreateDbContext();
        await SeedUsersAsync(db, ("Alice", UserRole.Admin), ("Bob", UserRole.Doctor), ("Carol", UserRole.Doctor));
        var service = CreateService(db);

        var result = await service.ListUsersAsync(new UserQueryDto { PageSize = 2 });

        Assert.Equal(new[] { "Alice", "Bob" }, result.Data.Items.Select(u => u.UserName));
        Assert.Equal(3, result.Data.TotalCount);
    }

    [Fact]
    public async Task ListUsersAsync_PageAfterTheEnd_IsEmptyWithTheTotal()
    {
        var db = CreateDbContext();
        await SeedUsersAsync(db, ("Alice", UserRole.Admin), ("Bob", UserRole.Doctor));
        var service = CreateService(db);

        var result = await service.ListUsersAsync(new UserQueryDto { Page = 3, PageSize = 2 });

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Data.Items);
        Assert.Equal(2, result.Data.TotalCount);
    }

    [Theory]
    [InlineData("doc", new[] { "Alice", "Docherty" })]
    [InlineData("DOC", new[] { "Alice", "Docherty" })]
    [InlineData("  bo ", new[] { "Bob" })]
    [InlineData("frontdesk", new[] { "Bob" })]
    [InlineData("admin", new[] { "Docherty", "Zed" })]
    [InlineData("nobody", new string[0])]
    public async Task ListUsersAsync_SearchMatchesNameOrRole(string search, string[] expected)
    {
        var db = CreateDbContext();
        await SeedUsersAsync(db,
            ("Alice", UserRole.Doctor), ("Bob", UserRole.FrontDesk),
            ("Docherty", UserRole.Admin), ("Zed", UserRole.DemoAdmin));
        var service = CreateService(db);

        var result = await service.ListUsersAsync(new UserQueryDto { Search = search });

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Data.Items.Select(u => u.UserName));
        Assert.Equal(expected.Length, result.Data.TotalCount);
    }

    [Theory]
    [InlineData(0, 50, "Page must be between 1 and 100000")]
    [InlineData(100_001, 50, "Page must be between 1 and 100000")]
    [InlineData(1, 0, "Page size must be between 1 and 100")]
    [InlineData(1, 101, "Page size must be between 1 and 100")]
    public async Task ListUsersAsync_PageOutOfRange_Fails(int page, int pageSize, string expectedError)
    {
        var db = CreateDbContext();
        var service = CreateService(db);

        var result = await service.ListUsersAsync(new UserQueryDto { Page = page, PageSize = pageSize });

        Assert.False(result.IsSuccess);
        Assert.Equal(expectedError, result.Error);
    }

    [Fact]
    public async Task ListUsersAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);

        var result = await service.ListUsersAsync(new UserQueryDto());
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Not allowed to list users", result.Error);
    }
 
    [Fact]
    public async Task ListDoctorsAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        db.Departments.AddRange(
            new DepartmentEntity { Id = 1, Department = "Cardiology" },
            new DepartmentEntity { Id = 2, Department = "Neurology" }
        );
        db.Users.AddRange(
            new UserEntity { Id = 1, Name = "Alice", Role = UserRole.Doctor, PasswordHash = "hashed" },
            new UserEntity { Id = 2, Name = "Bob", Role = UserRole.Doctor, PasswordHash = "hashed" }
        );
        db.Doctors.AddRange(
            new DoctorEntity { Id = 1, UserId = 1, DepartmentId = 1, IsActive = true },
            new DoctorEntity { Id = 2, UserId = 2, DepartmentId = 2, IsActive = false }
        );
        await db.SaveChangesAsync();
        var service = CreateService(db);
 
        var result = await service.ListDoctorsAsync();
 
        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Data.Count);
        Assert.Contains(result.Data, d => d.UserId == 1 && d.Name == "Alice" && d.IsActive == true);
        Assert.Contains(result.Data, d => d.UserId == 2 && d.Name == "Bob" && d.IsActive == false);
    }
 
    [Fact]
    public async Task ListDoctorsAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);
 
        var result = await service.ListDoctorsAsync();
 
        Assert.False(result.IsSuccess);
        Assert.Equal("You are not allowed to list doctors", result.Error);
    }
 
    [Fact]
    public async Task ListDoctorsAsync_FrontDesk_Succeeds()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false, isFrontDesk: true);
 
        var result = await service.ListDoctorsAsync();
 
        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task ListUsersAsync_FrontDesk_Fails()
    {
        var db = CreateDbContext();
        db.Users.Add(new UserEntity { Id = 1, Name = "admin", PasswordHash = "hashed", Role = UserRole.Admin });
        await db.SaveChangesAsync();
        var service = CreateService(db, isAdmin: false, isFrontDesk: true);

        var result = await service.ListUsersAsync(new UserQueryDto());

        Assert.False(result.IsSuccess);
        Assert.Equal("Not allowed to list users", result.Error);
    }

    [Theory]
    [InlineData(UserRole.DemoAdmin)]
    [InlineData(UserRole.DemoFrontDesk)]
    public async Task ListUsersAsync_DemoRole_Fails(UserRole demoRole)
    {
        var db = CreateDbContext();
        var currentUser = new Mock<ICurrentUserService>();
        currentUser.Setup(x => x.IsInRole(demoRole)).Returns(true);
        var service = new UserQueryService(db, currentUser.Object);

        var result = await service.ListUsersAsync(new UserQueryDto());

        Assert.False(result.IsSuccess);
        Assert.Equal("Not allowed to list users", result.Error);
    }
}
