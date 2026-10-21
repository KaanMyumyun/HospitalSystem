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

    // HS256 needs a 256-bit key. A shorter one used to pass startup and fail
    // every sign-in with a 500.
    [Fact]
    public async Task RefusesToStartWithAShorterSigningKey()
    {
        await using var app = TestApp.Create(jwtKey: new string('k', 31));

        var error = Assert.Throws<InvalidOperationException>(() => app.CreateClient());

        Assert.Contains("at least 32 bytes", error.Message);
    }
}
