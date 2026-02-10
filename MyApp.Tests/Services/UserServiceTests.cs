using System;
using System.Linq;
using System.Threading.Tasks;
using HospitalSystem.Interface;
using HospitalSystem.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

public class UserServiceTests
{
    private ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task ChangeDoctorStatus_Admin_Succeeds()
    {
        // Arrange
        var db = CreateDbContext();

        var department = new DepartmentEntity
        {
            Id = 1,
            Department = "Cardiology"
        };

        var user = new UserEntity
        {
            Id = 1,
            Name = "Dr Test",
            PasswordHash = "hashed",
            Role = UserRole.Doctor
        };

        var doctor = new DoctorEntity
        {
            Id = 1,
            UserId = 1,
            User = user,
            DepartmentId = 1,
            Department = department,
            IsActive = false
        };

        db.Departments.Add(department);
        db.Users.Add(user);
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        var dto = new ChangeDoctorsStatus
        {
            DoctorId = 1,
            IsActive = true
        };

        // Act
        var result = await service.ChangeDoctorsStatusAsync(dto);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.True(db.Doctors.First().IsActive);
    }

    [Fact]
    public async Task ChangeDoctorStatus_NotAdmin_Fails()
    {
        // Arrange
        var db = CreateDbContext();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(false);

        var service = new UserService(db, currentUserMock.Object);

        // Act
        var result = await service.ChangeDoctorsStatusAsync(
            new ChangeDoctorsStatus
            {
                DoctorId = 999,
                IsActive = true
            });

        // Assert
        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task ChangeDoctorStatus_SameStatus_Fails()
    {
        // Arrange
        var db = CreateDbContext();

        var department = new DepartmentEntity
        {
            Id = 1,
            Department = "Cardiology"
        };

        var user = new UserEntity
        {
            Id = 1,
            Name = "Dr Test",
            PasswordHash = "hashed",
            Role = UserRole.Doctor
        };

        var doctor = new DoctorEntity
        {
            Id = 1,
            UserId = 1,
            User = user,
            DepartmentId = 1,
            Department = department,
            IsActive = true
        };

        db.Departments.Add(department);
        db.Users.Add(user);
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        // Act
        var result = await service.ChangeDoctorsStatusAsync(
            new ChangeDoctorsStatus
            {
                DoctorId = 1,
                IsActive = true // same as current
            });

        // Assert
        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task ChangeDoctorStatus_ActivateDoctor_Succeeds()
    {
        // Arrange
        var db = CreateDbContext();

        var department = new DepartmentEntity
        {
            Id = 1,
            Department = "Cardiology"
        };

        var user = new UserEntity
        {
            Id = 1,
            Name = "Dr Test",
            PasswordHash = "hashed",
            Role = UserRole.Doctor
        };

        var doctor = new DoctorEntity
        {
            Id = 1,
            UserId = 1,
            User = user,
            DepartmentId = 1,
            Department = department,
            IsActive = false
        };

        db.Departments.Add(department);
        db.Users.Add(user);
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        var dto = new ChangeDoctorsStatus
        {
            DoctorId = 1,
            IsActive = true
        };

        // Act
        var result = await service.ChangeDoctorsStatusAsync(dto);

        Assert.True(result.IsSuccess);
        Assert.True(db.Doctors.First().IsActive);
    }

    [Fact]
    public async Task ChangeDoctorStatus_DeactivateDoctor_Succeeds()
    {
        // Arrange
        var db = CreateDbContext();

        var department = new DepartmentEntity
        {
            Id = 1,
            Department = "Cardiology"
        };

        var user = new UserEntity
        {
            Id = 1,
            Name = "Dr Test",
            PasswordHash = "hashed",
            Role = UserRole.Doctor
        };

        var doctor = new DoctorEntity
        {
            Id = 1,
            UserId = 1,
            User = user,
            DepartmentId = 1,
            Department = department,
            IsActive = true
        };

        db.Departments.Add(department);
        db.Users.Add(user);
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        var dto = new ChangeDoctorsStatus
        {
            DoctorId = 1,
            IsActive = false
        };

        // Act
        var result = await service.ChangeDoctorsStatusAsync(dto);

        Assert.True(result.IsSuccess);
        Assert.False(db.Doctors.First().IsActive);
    }


    [Fact]
    public async Task ChangeRoleAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(false);

        var service = new UserService(db, currentUserMock.Object);

        // Act
        var result = await service.ChangeRoleAsync(
            new ChangeRoleDto
            {
                UserId = 999,
                NewRole = UserRole.FrontDesk
            });

        // Assert
        Assert.False(result.IsSuccess);
    }


    [Fact]
    public async Task ChangeRoleAsync_Admin_Succeeds()
    {
        // Arrange
        var db = CreateDbContext();

        var department = new DepartmentEntity
        {
            Id = 1,
            Department = "Cardiology"
        };

        var user = new UserEntity
        {
            Id = 1,
            Name = "Dr Test",
            PasswordHash = "hashed",
            Role = UserRole.Doctor
        };

        var doctor = new DoctorEntity
        {
            Id = 1,
            UserId = 1,
            User = user,
            DepartmentId = 1,
            Department = department,
            IsActive = false
        };

        db.Departments.Add(department);
        db.Users.Add(user);
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        var dto = new ChangeRoleDto
        {
            UserId = 1,
            NewRole = UserRole.FrontDesk
        };

        // Act
        var result = await service.ChangeRoleAsync(dto);

        // Assert
        Assert.True(result.IsSuccess);
        var updatedUser = await db.Users.FindAsync(1);
        Assert.Equal(UserRole.FrontDesk, updatedUser.Role);
    }

    [Fact]
    public async Task ChangeRoleAsync_SameRole_Fail()
    {
        // Arrange
        var db = CreateDbContext();

        var department = new DepartmentEntity
        {
            Id = 1,
            Department = "Cardiology"
        };

        var user = new UserEntity
        {
            Id = 1,
            Name = "Dr Test",
            PasswordHash = "hashed",
            Role = UserRole.Doctor
        };

        var doctor = new DoctorEntity
        {
            Id = 1,
            UserId = 1,
            User = user,
            DepartmentId = 1,
            Department = department,
            IsActive = false
        };

        db.Departments.Add(department);
        db.Users.Add(user);
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        var dto = new ChangeRoleDto
        {
            UserId = 1,
            NewRole = UserRole.Doctor
        };

        // Act
        var result = await service.ChangeRoleAsync(dto);

        // Assert
        Assert.False(result.IsSuccess);
        var unchangedUser = await db.Users.FindAsync(1);
        Assert.Equal(UserRole.Doctor, unchangedUser.Role);
    }
    //1 User does not exist
    [Fact]
    public async Task ChangeRoleAsync_User_DoesntExist()
    {
        var db = CreateDbContext();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        var dto = new ChangeRoleDto
        {
            UserId = 1000,
            NewRole = UserRole.Doctor
        };
        // Act
        var result = await service.ChangeRoleAsync(dto);

        // Assert
        Assert.False(result.IsSuccess);
    }

    //2 Invalid role enum
    [Fact]
    public async Task ChangeRoleAsync_Enum_Invalid()
    {
        var db = CreateDbContext();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        var dto = new ChangeRoleDto
        {
            UserId = 1,
            NewRole = (UserRole)999
        };
        // Act
        var result = await service.ChangeRoleAsync(dto);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Role does not exist", result.Error);
    }

    //3 Pending role cannot be assigned
    [Fact]
    public async Task ChangeRoleAsync_Enum_PendingFail()
    {
        var db = CreateDbContext();

        var user = new UserEntity
        {
            Id = 1,
            Name = "Dr Test",
            PasswordHash = "hashed",
            Role = UserRole.Doctor
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        var dto = new ChangeRoleDto
        {
            UserId = 1,
            NewRole = UserRole.Pending
        };

        var result = await service.ChangeRoleAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Cannot assign Pending role", result.Error);
    }

    [Fact]
    public async Task CreateDoctorAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(false);

        var service = new UserService(db, currentUserMock.Object);

        // Act
        var result = await service.CreateDoctorAsync(
            new CreateDoctorDto
            {
                UserId = 1,
                NewRole = UserRole.FrontDesk
            });

        // Assert
        Assert.False(result.IsSuccess);
    }


    [Fact]
    public async Task CreateDoctorAsync_Admin_Succeeds()
    {
        // Arrange
        var db = CreateDbContext();

        var department = new DepartmentEntity
        {
            Id = 1,
            Department = "Cardiology"
        };

        var user = new UserEntity
        {
            Id = 1,
            Name = "Dr Test",
            PasswordHash = "hashed",
            Role = UserRole.FrontDesk
        };



        db.Departments.Add(department);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        var dto = new CreateDoctorDto
        {
            UserId = 1,
            DeparmentId = 1,
            NewRole = UserRole.Doctor
        };

        // Act
        var result = await service.CreateDoctorAsync(dto);

        // Assert
        Assert.True(result.IsSuccess);
        var createdDoctor = await db.Doctors.FirstOrDefaultAsync(d => d.UserId == 1);
        Assert.NotNull(createdDoctor);
        Assert.Equal(1, createdDoctor.DepartmentId);
        Assert.True(createdDoctor.IsActive);

        var updatedUser = await db.Users.FindAsync(1);
        Assert.Equal(UserRole.Doctor, updatedUser.Role);
    }

    [Fact]
    public async Task CreateDoctorAsync_Enum_Invalid()
    {
        var db = CreateDbContext();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        var dto = new CreateDoctorDto
        {
            UserId = 1,
            DeparmentId = 1,
            NewRole = (UserRole)999
        };
        // Act
        var result = await service.CreateDoctorAsync(dto);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Role does not exist", result.Error);
    }

    [Fact]
    public async Task CreateDoctorAsync_Enum_PendingFail()
    {
        var db = CreateDbContext();

        var user = new UserEntity
        {
            Id = 1,
            Name = "Dr Test",
            PasswordHash = "hashed",
            Role = UserRole.Doctor
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        var dto = new CreateDoctorDto
        {
            UserId = 1,
            DeparmentId = 1,
            NewRole = UserRole.Pending
        };

        var result = await service.CreateDoctorAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Cannot assign Pending role", result.Error);
    }

    [Fact]
    public async Task CreateDoctorAsync_User_DoesntExist()
    {
        var db = CreateDbContext();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        var dto = new CreateDoctorDto
        {
            UserId = 1000,
            DeparmentId = 1,
            NewRole = UserRole.Doctor
        };
        // Act
        var result = await service.CreateDoctorAsync(dto);

        // Assert
        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task CreateDoctorAsync_Deparment_DoesntExist()
    {
        var db = CreateDbContext();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        var dto = new CreateDoctorDto
        {
            UserId = 1,
            DeparmentId = 1000,
            NewRole = UserRole.Doctor
        };
        // Act
        var result = await service.CreateDoctorAsync(dto);

        // Assert
        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task CreateDoctorAsync_SameRole_Fail()
    {
        // Arrange
        var db = CreateDbContext();

        var department = new DepartmentEntity
        {
            Id = 1,
            Department = "Cardiology"
        };

        var user = new UserEntity
        {
            Id = 1,
            Name = "Dr Test",
            PasswordHash = "hashed",
            Role = UserRole.Doctor
        };

        var doctor = new DoctorEntity
        {
            Id = 1,
            UserId = 1,
            User = user,
            DepartmentId = 1,
            Department = department,
            IsActive = false
        };

        db.Departments.Add(department);
        db.Users.Add(user);
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        var dto = new CreateDoctorDto
        {
            UserId = 1,
            DeparmentId = 1,
            NewRole = UserRole.Doctor
        };

        // Act
        var result = await service.CreateDoctorAsync(dto);

        // Assert
        Assert.False(result.IsSuccess);
        var unchangedUser = await db.Users.FindAsync(1);
        Assert.Equal(UserRole.Doctor, unchangedUser.Role);
    }


    [Fact]
    public async Task ListUsersAsync_Admin_Succeeds()
    {
        // Arrange
        var db = CreateDbContext();

        db.Users.AddRange(
            new UserEntity
            {
                Id = 1,
                Name = "Alice",
                Role = UserRole.Doctor,
                PasswordHash = "hashed"
            },
            new UserEntity
            {
                Id = 2,
                Name = "Bob",
                Role = UserRole.FrontDesk,
                PasswordHash = "hashed"
            }
        );

        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        // Act
        var result = await service.ListUsersAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal(2, result.Data.Count);

        Assert.Contains(result.Data, u =>
            u.UserId == 1 &&
            u.UserName == "Alice" &&
            u.Role == UserRole.Doctor);

        Assert.Contains(result.Data, u =>
            u.UserId == 2 &&
            u.UserName == "Bob" &&
            u.Role == UserRole.FrontDesk);
    }



    [Fact]
    public async Task ListUsersAsync_NotAdmin_Fails()
    {
        // Arrange
        var db = CreateDbContext();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(false);

        var service = new UserService(db, currentUserMock.Object);

        // Act
        var result = await service.ListUsersAsync();

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Not allowed to list users", result.Error);
        Assert.Null(result.Data);
    }

    [Fact]
    public async Task ListDoctorsAsync_Admin_Succeeds()
    {
        // Arrange
        var db = CreateDbContext();

        var department1 = new DepartmentEntity
        {
            Id = 1,
            Department = "Cardiology"
        };

        var department2 = new DepartmentEntity
        {
            Id = 2,
            Department = "Neurology"
        };

        var user1 = new UserEntity
        {
            Id = 1,
            Name = "Alice",
            Role = UserRole.Doctor,
            PasswordHash = "hashed"
        };

        var user2 = new UserEntity
        {
            Id = 2,
            Name = "Bob",
            Role = UserRole.FrontDesk,
            PasswordHash = "hashed"
        };

        var doctor1 = new DoctorEntity
        {
            Id = 1,
            UserId = 1,
            DepartmentId = 1,
            IsActive = true
        };

        var doctor2 = new DoctorEntity
        {
            Id = 2,
            UserId = 2,
            DepartmentId = 2,
            IsActive = false
        };

        db.Departments.AddRange(department1, department2);
        db.Users.AddRange(user1, user2);
        db.Doctors.AddRange(doctor1, doctor2);

        await db.SaveChangesAsync();



        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        // Act
        var result = await service.ListDoctorsAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal(2, result.Data.Count);

        Assert.Contains(result.Data, u =>
            u.UserId == 1 &&
            u.DeparmentId == 1 &&
            u.DoctorId == 1 &&
            u.Name == "Alice" &&
            u.IsActive == true);

        Assert.Contains(result.Data, u =>
            u.UserId == 2 &&
            u.DeparmentId == 2 &&
            u.DoctorId == 2 &&
            u.Name == "Bob" &&
            u.IsActive == false);
    }

    [Fact]
    public async Task ListDoctorsAsync_NotAdmin_Fails()
    {
        // Arrange
        var db = CreateDbContext();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(false);

        var service = new UserService(db, currentUserMock.Object);

        // Act
        var result = await service.ListDoctorsAsync();

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("You are not allowed to list doctors", result.Error);
        Assert.Null(result.Data);
    }

     
    [Fact]
    public async Task ResetPasswordAsync_User_DoesntExist()
    {
        var db = CreateDbContext();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        var dto = new ResetPasswordDto
        {
            UserId = 1000,
            NewPassword = "true"
        };
        // Act
        var result = await service.ResetPasswordAsync(dto);

        // Assert
        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task ResetPasswordAsync_EmptyPassword_Fails()
    {
          var db = CreateDbContext();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock
            .Setup(x => x.IsInRole(UserRole.Admin))
            .Returns(true);

        var service = new UserService(db, currentUserMock.Object);

        var dto = new ResetPasswordDto
        {
            UserId = 1,
            NewPassword = ""
        };
        // Act
        var result = await service.ResetPasswordAsync(dto);

        // Assert
        Assert.False(result.IsSuccess);
    }


}


