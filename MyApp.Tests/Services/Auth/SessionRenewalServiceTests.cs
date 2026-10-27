using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using HospitalSystem.Interfaces;
using HospitalSystem.Services.Auth;
using Moq;

namespace HospitalSystem.Tests;

public class SessionRenewalServiceTests : AuthTestBase
{
    private static readonly DateTimeOffset SignedIn = new(2026, 3, 2, 8, 0, 0, TimeSpan.Zero);

    private SessionRenewalService CreateService(ApplicationDbContext db, DateTimeOffset now, DateTimeOffset? signedInAt, string userId = "1")
    {
        var caller = new Mock<ICurrentUserService>();
        caller.Setup(x => x.UserId).Returns(userId);
        caller.Setup(x => x.SignedInAt).Returns(signedInAt);
        return new(db, caller.Object, CreateJwtOptions(), new FixedClock(now), TestClinic.In("Europe/Sofia"));
    }

    // Read without checking expiry: these tokens are issued at a fixed time.
    private static JwtSecurityToken Read(string token) => new JwtSecurityTokenHandler().ReadJwtToken(token);

    [Fact]
    public async Task Renew_GivesAnotherHour_AndKeepsWhenTheSessionBegan()
    {
        var db = CreateDbContext();
        await SeedUserAsync(db, UserRole.FrontDesk, "desk");
        var now = SignedIn.AddMinutes(40);

        var result = await CreateService(db, now, SignedIn).RenewAsync();

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(UserRole.FrontDesk, result.Role);
        Assert.Equal("Europe/Sofia", result.TimeZone);
        var token = Read(result.Token!);
        Assert.Equal(now.AddHours(1).UtcDateTime, token.ValidTo);
        Assert.Equal(
            SignedIn.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture),
            token.Claims.Single(c => c.Type == SessionTokens.SignedInAtClaimType).Value);
    }

    [Fact]
    public async Task Renew_NeverOutlastsTwelveHoursFromSigningIn()
    {
        var db = CreateDbContext();
        await SeedUserAsync(db, UserRole.FrontDesk, "desk");

        var result = await CreateService(db, SignedIn.AddHours(11.5), SignedIn).RenewAsync();

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(SignedIn.AddHours(12).UtcDateTime, Read(result.Token!).ValidTo);
    }

    [Theory]
    [InlineData(12)]
    [InlineData(20)]
    public async Task Renew_TwelveHoursAfterSigningIn_IsRefused(int hours)
    {
        var db = CreateDbContext();
        await SeedUserAsync(db, UserRole.FrontDesk, "desk");

        var result = await CreateService(db, SignedIn.AddHours(hours), SignedIn).RenewAsync();

        Assert.False(result.IsSuccess);
        Assert.Null(result.Token);
        Assert.Equal("Sign in again: a session lasts at most 12 hours", result.Error);
    }

    // Tokens from before renewal existed do not say when their session began.
    [Fact]
    public async Task Renew_ATokenWithoutItsSessionStart_IsRefused()
    {
        var db = CreateDbContext();
        await SeedUserAsync(db, UserRole.FrontDesk, "desk");

        var result = await CreateService(db, SignedIn.AddMinutes(40), signedInAt: null).RenewAsync();

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Renew_ForAUserWhoIsGone_IsRefused()
    {
        var db = CreateDbContext();

        var result = await CreateService(db, SignedIn.AddMinutes(40), SignedIn, userId: "99").RenewAsync();

        Assert.False(result.IsSuccess);
    }
}
