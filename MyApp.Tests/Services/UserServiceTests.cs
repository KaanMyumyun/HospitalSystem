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
}
