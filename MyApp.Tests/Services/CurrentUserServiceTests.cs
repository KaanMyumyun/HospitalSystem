using System.Security.Claims;
using HospitalSystem.Services;
using Microsoft.AspNetCore.Http;

namespace HospitalSystem.Tests;

public class CurrentUserServiceTests
{
    private static CurrentUserService For(params Claim[] claims) =>
        new(new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer")) }
        });

    [Fact]
    public void UserId_IsTheNameIdentifierClaim()
    {
        Assert.Equal("42", For(new Claim(ClaimTypes.NameIdentifier, "42")).UserId);
    }

    [Theory]
    [InlineData(ClaimTypes.Role, "Admin")]
    [InlineData("role", "Admin")]
    public void IsInRole_ReadsEitherRoleClaimType(string claimType, string value)
    {
        var user = For(new Claim(claimType, value));

        Assert.True(user.IsInRole(UserRole.Admin));
        Assert.False(user.IsInRole(UserRole.FrontDesk));
    }

    [Fact]
    public void IsInRole_IgnoresSpacesInTheRoleName()
    {
        Assert.True(For(new Claim(ClaimTypes.Role, "Front Desk")).IsInRole(UserRole.FrontDesk));
    }

    [Fact]
    public void OutsideARequest_NobodyIsSignedIn()
    {
        var user = new CurrentUserService(new HttpContextAccessor());

        Assert.Null(user.UserId);
        Assert.False(user.IsInRole(UserRole.Admin));
    }
}
