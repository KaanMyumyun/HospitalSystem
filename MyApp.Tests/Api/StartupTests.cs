using System.Net;

namespace HospitalSystem.Tests;

public class StartupTests
{
    [Fact]
    public async Task StartsWithA32ByteSigningKey()
    {
        await using var app = TestApp.Create(jwtKey: new string('k', 32));

        var response = await app.CreateClient().GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("Mars/Olympus_Mons")]
    public void RefusesToStartWithoutAKnownClinicTimeZone(string timeZone)
    {
        var app = TestApp.Create(settings: new Dictionary<string, string?> { ["Clinic:TimeZone"] = timeZone });

        var error = Assert.Throws<InvalidOperationException>(() => app.CreateClient());

        Assert.Contains("Clinic:TimeZone", error.Message);
    }

    [Fact]
    public async Task RefusesToStartWithAShorterSigningKey()
    {
        await using var app = TestApp.Create(jwtKey: new string('k', 31));

        var error = Assert.Throws<InvalidOperationException>(() => app.CreateClient());

        Assert.Contains("at least 32 bytes", error.Message);
    }

    [Theory]
    [InlineData("THIS_SHOULD_BE_LONG_AND_SECRET_123456789")]
    [InlineData("replace-with-a-random-string-of-at-least-32-characters")]
    public async Task RefusesToStartWithAPublishedKey(string key)
    {
        await using var app = TestApp.Create(jwtKey: key);

        var error = Assert.Throws<InvalidOperationException>(() => app.CreateClient());

        Assert.Contains("published example value", error.Message);
    }

    [Fact]
    public async Task RefusesAForwardLimitBelowOne()
    {
        await using var app = TestApp.Create(settings: new Dictionary<string, string?>
        {
            ["ForwardedHeaders:ForwardLimit"] = "0"
        });

        var error = Assert.Throws<InvalidOperationException>(() => app.CreateClient());

        Assert.Contains("ForwardLimit must be at least 1", error.Message);
    }
}
