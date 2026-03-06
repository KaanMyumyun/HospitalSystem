using HospitalSystem.Interface;
using HospitalSystem.Services;
using Microsoft.EntityFrameworkCore;
using Moq;

public class DeparmentServiceTest
{
    private ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private DepartmentService CreateService(ApplicationDbContext db, bool isAdmin = true)
    {
        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.IsInRole(UserRole.Admin)).Returns(isAdmin);
        return new DepartmentService(db, currentUserMock.Object);
    }

    private async Task Seed(ApplicationDbContext db, bool isDoctorActive = false, UserRole userRole = UserRole.Admin)
    {
        var department = new DepartmentEntity { Id = 1, Department = "Cardiology" };
        var user = new UserEntity { Id = 1, Name = "Dr Test", PasswordHash = "hashed", Role = userRole };
        var doctor = new DoctorEntity { Id = 1, UserId = 1, User = user, DepartmentId = 1, Department = department, IsActive = isDoctorActive };

        db.Departments.Add(department);
        db.Users.Add(user);
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task ChangeDepartmentStatusAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        await Seed(db, isDoctorActive: false);
        var service = CreateService(db, isAdmin: true);

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
    public async Task ChangeDepartmentStatusAsync_Deparmnet_DoesntExist()
    {
        var db = CreateDbContext();
        await Seed(db, isDoctorActive: false);
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeDepartmentStatusAsync(new ChangeDepartmentStatusDto { DepartmentId = 999, IsActive = true });

        Assert.False(result.IsSuccess);
        Assert.Equal("Department doesnt exist", result.Error);
    }


}