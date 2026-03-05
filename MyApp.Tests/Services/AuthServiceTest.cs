using HospitalSystem.Interface;
using HospitalSystem.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Moq;

public class AuthServiceTest
{
    private ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private AuthService CreateService(ApplicationDbContext db, bool isAdmin = true)
    {
        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.IsInRole(UserRole.Admin)).Returns(isAdmin);
        var jwtToken = Options.Create(new JwtSettings
        {
            SecretKey = "super_secret_test_key_123452353535352353",// it has to be over 256bytes
            Issuer = "test",
            Audience = "test"
        });
 return new AuthService(db, jwtToken, currentUserMock.Object);
    }

    private const string TestPassword = "correct-password";
    private async Task SeedAUser(ApplicationDbContext db,UserRole userRole = UserRole.Admin)
    {
       var user = new UserEntity { Id = 1, Name = "Test", Role = userRole };
          var hasher = new PasswordHasher<UserEntity>();
    user.PasswordHash = hasher.HashPassword(user, TestPassword);
            db.Users.Add(user);
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Login_Succesful()
    {
        var db = CreateDbContext();
        await SeedAUser(db);
        var service = CreateService(db);

        var result = await service.LoginAsync(new LoginDto { Name = "Test", Password = TestPassword });

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task Login_Wrong_Credentials()
    {
        var db = CreateDbContext();
        await SeedAUser(db);
        var service = CreateService(db);

        var result = await service.LoginAsync(new LoginDto { Name = "Tet", Password = "d" });

        Assert.False(result.IsSuccess);
    }


    [Fact]
    public async Task Login_Wrong_Password()
    {
        var db = CreateDbContext();
        await SeedAUser(db);
        var service = CreateService(db);

        var result = await service.LoginAsync(new LoginDto { Name = "Test", Password = "d" });

        Assert.False(result.IsSuccess);
    }

     [Fact]
    public async Task Login_Wrong_Name()
    {
        var db = CreateDbContext();
        await SeedAUser(db);
        var service = CreateService(db);

        var result = await service.LoginAsync(new LoginDto { Name = "Tes", Password = TestPassword});

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task CreateUser_WhenUserIsNotAdmin_ReturnsFail()
    {
        using var db = CreateDbContext();
        var sut = CreateService(db, isAdmin: false); 
        var dto = new CreateUserDto { Name = "NewUser", Password = "Password123" };

        var result = await sut.CreateUser(dto);

    
        Assert.False(result.IsSuccess);
        Assert.Equal("You are not allowed to create a doctor", result.Error);
    }

   

   public async Task CreateUser_WhenCredInvalid_ReturnsFail(string name, string password)
    {
        using var db = CreateDbContext();
        var sut = CreateService(db, isAdmin: true);
        var dto = new CreateUserDto { Name = name, Password = password };

       var result = await sut.CreateUser(dto);

       Assert.False(result.IsSuccess);
        Assert.Equal("InvalidCredential", result.Error);
    }

    [Fact]
    public async Task CreateUser_UserExist_ReturnsFail()
    {
        using var db = CreateDbContext();
        var sut = CreateService(db, isAdmin: true);
        
        await SeedAUser(db); 
        
        var dto = new CreateUserDto { Name = "Test", Password = "Password123" };

        // Act
        var result = await sut.CreateUser(dto);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Name already exists", result.Error);
    }

    [Fact]
    public async Task CreateUser_WhenValidData_CreatesUserAndReturnsSuccess()
    {
        using var db = CreateDbContext();
        var sut = CreateService(db, isAdmin: true);
        var dto = new CreateUserDto { Name = "BrandNewUser", Password = "Password123" };

        
        var result = await sut.CreateUser(dto);

   
        Assert.True(result.IsSuccess);

        var savedUser = await db.Users.FirstOrDefaultAsync(u => u.Name == "BrandNewUser");
        Assert.NotNull(savedUser);
        Assert.Equal("BrandNewUser", savedUser.Name);
        Assert.Equal(UserRole.Pending, savedUser.Role);
        
        Assert.NotEqual(dto.Password, savedUser.PasswordHash);
        Assert.NotNull(savedUser.PasswordHash);
    }
}


