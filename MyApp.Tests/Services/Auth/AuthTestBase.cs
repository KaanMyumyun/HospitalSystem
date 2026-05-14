using HospitalSystem.Interface;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Moq;
 
public abstract class AuthTestBase
{
    protected ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
 
        return new ApplicationDbContext(options);
    }
 
    protected IOptions<JwtSettings> CreateJwtOptions() =>
        Options.Create(new JwtSettings
        {
            SecretKey = "super_secret_test_key_123452353535352353",
            Issuer = "test",
            Audience = "test"
        });
 
    protected ICurrentUserService CreateCurrentUser(bool isAdmin = true)
    {
        var mock = new Mock<ICurrentUserService>();
        mock.Setup(x => x.IsInRole(UserRole.Admin)).Returns(isAdmin);
        return mock.Object;
    }
 
    protected const string TestPassword = "correct-password";
 
    protected async Task SeedUserAsync(ApplicationDbContext db, UserRole role = UserRole.Admin)
    {
        var user = new UserEntity { Id = 1, Name = "Test", Role = role };
        var hasher = new PasswordHasher<UserEntity>();
        user.PasswordHash = hasher.HashPassword(user, TestPassword);
        db.Users.Add(user);
        await db.SaveChangesAsync();
    }
}
