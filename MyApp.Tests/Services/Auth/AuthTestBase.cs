using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HospitalSystem.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Moq;

namespace HospitalSystem.Tests;
 
public abstract class AuthTestBase
{
    protected ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
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

    protected IOptions<DemoSettings> CreateDemoOptions(bool enabled = true) =>
        Options.Create(new DemoSettings
        {
            Enabled = enabled,
            AdminUserName = "DemoAdmin",
            FrontDeskUserName = "DemoReception"
        });
 
    protected ICurrentUserService CreateCurrentUser(bool isAdmin = true)
    {
        var mock = new Mock<ICurrentUserService>();
        mock.Setup(x => x.IsInRole(UserRole.Admin)).Returns(isAdmin);
        return mock.Object;
    }
 
    protected const string TestPassword = "correct-password";
 
    protected async Task<UserEntity> SeedUserAsync(ApplicationDbContext db, UserRole role = UserRole.Admin, string name = "Test")
    {
        var user = new UserEntity { Id = 1, Name = name, Role = role };
        var hasher = new PasswordHasher<UserEntity>();
        user.PasswordHash = hasher.HashPassword(user, TestPassword);
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    protected ClaimsPrincipal ReadValidatedToken(string token)
    {
        var settings = CreateJwtOptions().Value;

        return new JwtSecurityTokenHandler().ValidateToken(token, new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = settings.Issuer,
            ValidAudience = settings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.SecretKey))
        }, out _);
    }
}
