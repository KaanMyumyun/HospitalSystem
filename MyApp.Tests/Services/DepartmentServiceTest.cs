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
    var cardiology = new DepartmentEntity { Id = 1, Department = "Cardiology", IsActive = false };
    var emergency = new DepartmentEntity { Id = 2, Department = "Emergency", IsActive = true };

    var doctorUser1 = new UserEntity { Id = 1, Name = "Dr Test", PasswordHash = "hashed", Role = UserRole.Doctor };
    var doctorUser2 = new UserEntity { Id = 2, Name = "Dr Test2", PasswordHash = "hashed", Role = UserRole.Doctor };

    var doctor1 = new DoctorEntity { Id = 1, UserId = doctorUser1.Id, User = doctorUser1, DepartmentId = cardiology.Id, Department = cardiology, IsActive = isDoctorActive };
    var doctor2 = new DoctorEntity { Id = 2, UserId = doctorUser2.Id, User = doctorUser2, DepartmentId = emergency.Id, Department = emergency, IsActive = isDoctorActive };

    db.Departments.AddRange(cardiology, emergency);
    db.Users.AddRange(doctorUser1, doctorUser2);
    db.Doctors.AddRange(doctor1, doctor2);

    await db.SaveChangesAsync();
}

    [Fact]
    public async Task ChangeDepartmentStatusAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        await Seed(db, isDoctorActive: true);
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
        await Seed(db, isDoctorActive: true);
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeDepartmentStatusAsync(new ChangeDepartmentStatusDto { DepartmentId = 999, IsActive = true });

        Assert.False(result.IsSuccess);
        Assert.Equal("Department doesnt exist", result.Error);
    }

     [Fact]
    public async Task CreateDepartmentAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        await Seed(db, isDoctorActive: false);
        var service = CreateService(db, isAdmin: true);

        var result = await service.CreateDepartmentAsync(new CreateDepartmentDto {Name = "DDD"});

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
    public async Task CreateDepartmentAsync_DeparmentExist_Fails()
    {
        var db = CreateDbContext();
        await Seed(db, isDoctorActive: true);
        var service = CreateService(db, isAdmin: true);

        var result = await service.CreateDepartmentAsync(new CreateDepartmentDto { Name ="Cardiology"});

        Assert.False(result.IsSuccess);
        Assert.Equal("Department already exists", result.Error);
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

    [Fact]
    public async Task ListDepartmentsAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        db.Departments.AddRange(
            new DepartmentEntity { Id = 1, Department = "Cardiology",IsActive =true },
            new DepartmentEntity { Id = 2, Department = "Neurology" ,IsActive =false    }
        );
        await db.SaveChangesAsync();
        var service = CreateService(db, isAdmin: true);

        var result = await service.ListDepartmentsAsync();

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Data.Count);
        Assert.Contains(result.Data, u => u.Id == 1 && u.Name == "Cardiology" && u.IsActive == true);
        Assert.Contains(result.Data, u => u.Id == 2 && u.Name == "Neurology" && u.IsActive == false);
    }


      [Fact]
    public async Task ChangeDoctorDepartmentAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        await Seed(db, isDoctorActive: true);
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeDoctorDepartmentAsync(new ChangeDoctorDepartmentDto {DoctorId = 1, DepartmentId = 2});

        Assert.True(result.IsSuccess);
    }

      [Fact]
    public async Task ChangeDoctorDepartmentAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);

        var result = await service.ChangeDoctorDepartmentAsync(new ChangeDoctorDepartmentDto { DoctorId = 1, DepartmentId = 2});

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task ChangeDoctorDepartmentAsync_DoctorExist_Fails()
    {
        var db = CreateDbContext();
        await Seed(db, isDoctorActive: true);
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeDoctorDepartmentAsync(new ChangeDoctorDepartmentDto {DoctorId = 10000, DepartmentId = 2});

        Assert.False(result.IsSuccess);
        Assert.Equal("Doctor doesnt exist ", result.Error);
    }

    [Fact]
    public async Task ChangeDoctorDepartmentAsync_DoctorInactive_Fail()
    {
        var db = CreateDbContext();
        await Seed(db, isDoctorActive: false);
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeDoctorDepartmentAsync(new ChangeDoctorDepartmentDto { DoctorId = 1, DepartmentId = 2 });

        Assert.False(result.IsSuccess);
        Assert.Equal("This Doctor isnt active", result.Error);
    }

    [Fact]
    public async Task ChangeDoctorDepartmentAsync_DeparmentExist_Fails()
    {
        var db = CreateDbContext();
        await Seed(db, isDoctorActive: true);
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeDoctorDepartmentAsync(new ChangeDoctorDepartmentDto {DoctorId = 1, DepartmentId = 1000});

        Assert.False(result.IsSuccess);
        Assert.Equal("Department doesnt exist", result.Error);
    }

      [Fact]
    public async Task ChangeDoctorDepartmentAsync_DeparmentInactive_Fail()
    {
        var db = CreateDbContext();
        await Seed(db, isDoctorActive: true);
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeDoctorDepartmentAsync(new ChangeDoctorDepartmentDto { DoctorId = 1, DepartmentId = 1 });

        Assert.False(result.IsSuccess);
        Assert.Equal("This Deparment isnt active", result.Error);
    }


        [Fact]
    public async Task ChangeDoctorDepartmentAsync_DoctorAlreadyInThatDeparment_Fail()
    {
        var db = CreateDbContext();
        await Seed(db, isDoctorActive: true);
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeDoctorDepartmentAsync(new ChangeDoctorDepartmentDto { DoctorId = 2, DepartmentId = 2});

        Assert.False(result.IsSuccess);
        Assert.Equal("Already in that department", result.Error);
    }
}