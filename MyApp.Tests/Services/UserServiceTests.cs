using System;
using System.Linq;
using System.Threading.Tasks;
using HospitalSystem.Interface;
using HospitalSystem.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using Microsoft.AspNetCore.Identity;

public class UserServiceTests
{
    private ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private UserService CreateService(ApplicationDbContext db, bool isAdmin = true)
    {
        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.IsInRole(UserRole.Admin)).Returns(isAdmin);
        return new UserService(db, currentUserMock.Object);
    }

    private async Task SeedStandardDoctorAsync(ApplicationDbContext db, bool isDoctorActive = false, UserRole userRole = UserRole.Doctor)
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
    public async Task ChangeDoctorStatus_Admin_Succeeds()
    {
        var db = CreateDbContext();
        await SeedStandardDoctorAsync(db, isDoctorActive: false);
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeDoctorsStatusAsync(new ChangeDoctorsStatus { DoctorId = 1, IsActive = true });

        Assert.True(result.IsSuccess);
        Assert.True(db.Doctors.First().IsActive);
    }

    [Fact]
    public async Task ChangeDoctorStatus_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);

        var result = await service.ChangeDoctorsStatusAsync(new ChangeDoctorsStatus { DoctorId = 999, IsActive = true });

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task ChangeDoctorStatus_SameStatus_Fails()
    {
        var db = CreateDbContext();
        await SeedStandardDoctorAsync(db, isDoctorActive: true);
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeDoctorsStatusAsync(new ChangeDoctorsStatus { DoctorId = 1, IsActive = true });

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task ChangeDoctorStatus_DeactivateDoctor_Succeeds()
    {
        var db = CreateDbContext();
        await SeedStandardDoctorAsync(db, isDoctorActive: true);
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeDoctorsStatusAsync(new ChangeDoctorsStatus { DoctorId = 1, IsActive = false });

        Assert.True(result.IsSuccess);
        Assert.False(db.Doctors.First().IsActive);
    }

    [Fact]
    public async Task ChangeRoleAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);

        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 999, NewRole = UserRole.FrontDesk });

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task ChangeRoleAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        await SeedStandardDoctorAsync(db, isDoctorActive: false);
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 1, NewRole = UserRole.FrontDesk });

        Assert.True(result.IsSuccess);
        Assert.Equal(UserRole.FrontDesk, (await db.Users.FindAsync(1)).Role);
    }

    [Fact]
    public async Task ChangeRoleAsync_SameRole_Fail()
    {
        var db = CreateDbContext();
        await SeedStandardDoctorAsync(db, isDoctorActive: false);
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 1, NewRole = UserRole.Doctor });

        Assert.False(result.IsSuccess);
        Assert.Equal(UserRole.Doctor, (await db.Users.FindAsync(1)).Role);
    }

    [Fact]
    public async Task ChangeRoleAsync_User_DoesntExist()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 1000, NewRole = UserRole.Doctor });

        Assert.False(result.IsSuccess);
    }
    [Fact]
    public async Task ChangeRoleAsync_Enum_Invalid()
    {
        var db = CreateDbContext();
        db.Users.Add(new UserEntity { Id = 1, Name = "Dr Test", PasswordHash = "hashed", Role = UserRole.Doctor });
        await db.SaveChangesAsync();

        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 1, NewRole = (UserRole)999 });

        Assert.False(result.IsSuccess);
        Assert.Equal("Invalid role", result.Error);
    }

    [Fact]
    public async Task ChangeRoleAsync_Enum_PendingFail()
    {
        var db = CreateDbContext();
        db.Users.Add(new UserEntity { Id = 1, Name = "Dr Test", PasswordHash = "hashed", Role = UserRole.Doctor });
        await db.SaveChangesAsync();
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 1, NewRole = UserRole.Pending });

        Assert.False(result.IsSuccess);
        Assert.Equal("Invalid role", result.Error);
    }

    [Fact]
    public async Task CreateDoctorAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);

        var result = await service.CreateDoctorAsync(new CreateDoctorDto { UserId = 1 });

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task CreateDoctorAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        db.Departments.Add(new DepartmentEntity { Id = 1, Department = "Cardiology" });
        db.Users.Add(new UserEntity { Id = 1, Name = "Dr Test", PasswordHash = "hashed", Role = UserRole.FrontDesk });
        await db.SaveChangesAsync();

        var service = CreateService(db, isAdmin: true);
        var result = await service.CreateDoctorAsync(new CreateDoctorDto { UserId = 1, DepartmentId = 1 });

        Assert.True(result.IsSuccess);

        var createdDoctor = await db.Doctors.FirstOrDefaultAsync(d => d.UserId == 1);
        Assert.NotNull(createdDoctor);
        Assert.Equal(1, createdDoctor.DepartmentId);
        Assert.True(createdDoctor.IsActive);
        Assert.Equal(UserRole.Doctor, (await db.Users.FindAsync(1)).Role);
    }

    [Fact]
    public async Task CreateDoctorAsync_User_DoesntExist()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: true);

        var result = await service.CreateDoctorAsync(new CreateDoctorDto { UserId = 1000, DepartmentId = 1 });

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task CreateDoctorAsync_Deparment_DoesntExist()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: true);

        var result = await service.CreateDoctorAsync(new CreateDoctorDto { UserId = 1, DepartmentId = 1000 });

        Assert.False(result.IsSuccess);
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
        var service = CreateService(db, isAdmin: true);

        var result = await service.ListUsersAsync();

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Data.Count);
        Assert.Contains(result.Data, u => u.UserId == 1 && u.UserName == "Alice" && u.Role == UserRole.Doctor);
        Assert.Contains(result.Data, u => u.UserId == 2 && u.UserName == "Bob" && u.Role == UserRole.FrontDesk);
    }

    [Fact]
    public async Task ListUsersAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);

        var result = await service.ListUsersAsync();

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
        var service = CreateService(db, isAdmin: true);

        var result = await service.ListDoctorsAsync();

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Data.Count);
        Assert.Contains(result.Data, u => u.UserId == 1 && u.Name == "Alice" && u.IsActive == true);
        Assert.Contains(result.Data, u => u.UserId == 2 && u.Name == "Bob" && u.IsActive == false);
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
    public async Task ResetPasswordAsync_User_DoesntExist()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: true);

        var result = await service.ResetPasswordAsync(new ResetPasswordDto { UserId = 1000, NewPassword = "true" });

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task ResetPasswordAsync_EmptyPassword_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: true);

        var result = await service.ResetPasswordAsync(new ResetPasswordDto { UserId = 1, NewPassword = "" });

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task ResetPasswordAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        await SeedStandardDoctorAsync(db, isDoctorActive: false);
        var service = CreateService(db, isAdmin: true);

        var result = await service.ResetPasswordAsync(new ResetPasswordDto { UserId = 1, NewPassword = "true" });

        Assert.True(result.IsSuccess);
        Assert.NotEqual("hashed", (await db.Users.FindAsync(1)).PasswordHash);
    }

    [Fact]
    public async Task ResetPasswordAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);

        var result = await service.ResetPasswordAsync(new ResetPasswordDto { UserId = 1, NewPassword = "true" });

        Assert.False(result.IsSuccess);
    }
    [Fact]
    public async Task ChangeDoctorStatus_DoctorDoesNotExist_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeDoctorsStatusAsync(new ChangeDoctorsStatus { DoctorId = 999, IsActive = true });

        Assert.False(result.IsSuccess);
        Assert.Equal("Doctor doesnt exist", result.Error);
    }

    [Fact]
    public async Task ChangeRoleAsync_ToDoctor_CreatesDoctorEntity()
    {
        var db = CreateDbContext();
        db.Users.Add(new UserEntity { Id = 1, Name = "Regular User", Role = UserRole.FrontDesk, PasswordHash = "hash" });
        await db.SaveChangesAsync();
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 1, NewRole = UserRole.Doctor });

        Assert.True(result.IsSuccess);
        var createdDoctor = await db.Doctors.FirstOrDefaultAsync(d => d.UserId == 1);
        Assert.NotNull(createdDoctor);
        Assert.False(createdDoctor.IsActive);
        Assert.Equal(1, createdDoctor.DepartmentId);
    }

    [Fact]
    public async Task ChangeRoleAsync_AwayFromDoctor_DeactivatesDoctor()
    {
        var db = CreateDbContext();
        await SeedStandardDoctorAsync(db, isDoctorActive: true, userRole: UserRole.Doctor);
        var service = CreateService(db, isAdmin: true);

        var result = await service.ChangeRoleAsync(new ChangeRoleDto { UserId = 1, NewRole = UserRole.FrontDesk });

        Assert.True(result.IsSuccess);
        var doctor = await db.Doctors.FirstOrDefaultAsync(d => d.UserId == 1);
        Assert.NotNull(doctor);
        Assert.False(doctor.IsActive);
    }

    [Fact]
    public async Task CreateDoctorAsync_DoctorAlreadyExists_UpdatesAndReactivates()
    {
        var db = CreateDbContext();
        await SeedStandardDoctorAsync(db, isDoctorActive: false, userRole: UserRole.Doctor);
        db.Departments.Add(new DepartmentEntity { Id = 2, Department = "Neurology" });
        await db.SaveChangesAsync();

        var service = CreateService(db, isAdmin: true);

        var result = await service.CreateDoctorAsync(new CreateDoctorDto { UserId = 1, DepartmentId = 2 });

        Assert.True(result.IsSuccess);
        var doctor = await db.Doctors.FirstOrDefaultAsync(d => d.UserId == 1);
        Assert.True(doctor.IsActive);
        Assert.Equal(2, doctor.DepartmentId);
    }

    [Fact]
    public async Task ListDoctorsAsync_FrontDesk_Succeeds()
    {
        var db = CreateDbContext();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.IsInRole(UserRole.Admin)).Returns(false);
        currentUserMock.Setup(x => x.IsInRole(UserRole.FrontDesk)).Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        var result = await service.ListDoctorsAsync();

        Assert.True(result.IsSuccess);
    }
}