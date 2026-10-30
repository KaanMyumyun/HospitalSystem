using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace HospitalSystem.Tests;

public class LoginRateLimitTests
{
    private static async Task<HttpResponseMessage> LoginAsync(
        HttpClient client, string name, string? forwardedFor = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new { name, password = "wrong-password" })
        };
        if (forwardedFor is not null)
            request.Headers.Add("X-Forwarded-For", forwardedFor);
        return await client.SendAsync(request);
    }

    [Fact]
    public async Task PublicLoginFailure_DoesNotRevealWhetherAnAccountIsLocked()
    {
        using var app = TestApp.Create(database: Guid.NewGuid().ToString());
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var hasher = new PasswordHasher<UserEntity>();
            var locked = new UserEntity
            {
                Name = "locked", Role = UserRole.Admin,
                LockedUntil = DateTime.UtcNow.AddMinutes(15)
            };
            locked.PasswordHash = hasher.HashPassword(locked, "correct-password");
            var ordinary = new UserEntity { Name = "ordinary", Role = UserRole.Admin };
            ordinary.PasswordHash = hasher.HashPassword(ordinary, "correct-password");
            db.Users.AddRange(locked, ordinary);
            await db.SaveChangesAsync();
        }

        using var client = app.CreateClient();
        using var lockedResponse = await LoginAsync(client, "locked");
        using var wrongResponse = await LoginAsync(client, "ordinary");
        using var unknownResponse = await LoginAsync(client, "nobody");

        Assert.Equal(HttpStatusCode.Unauthorized, lockedResponse.StatusCode);
        Assert.Equal(lockedResponse.StatusCode, wrongResponse.StatusCode);
        Assert.Equal(lockedResponse.StatusCode, unknownResponse.StatusCode);
        var lockedBody = await lockedResponse.Content.ReadAsStringAsync();
        Assert.Equal(lockedBody, await wrongResponse.Content.ReadAsStringAsync());
        Assert.Equal(lockedBody, await unknownResponse.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task LoginLimit_UsesTheNormalizedUsernameAndClientAddress()
    {
        using var app = TestApp.Create(database: Guid.NewGuid().ToString(), settings: new Dictionary<string, string?>
        {
            ["ForwardedHeaders:TrustAllProxies"] = "true"
        });
        using var client = app.CreateClient();

        foreach (var name in new[] { " Alice ", "ALICE", "alice", "Alice", " aLiCe " })
            Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(client, name, "203.0.113.1")).StatusCode);

        using var limited = await LoginAsync(client, "alice", "203.0.113.1");
        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.True(limited.Headers.RetryAfter?.Delta > TimeSpan.Zero);
        var body = await limited.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("Too many requests", body.GetProperty("error").GetString());

        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(client, "bob", "203.0.113.1")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(client, "alice", "203.0.113.2")).StatusCode);
    }

    [Fact]
    public async Task Login_RejectsUsernamesLongerThanTheDatabaseColumn()
    {
        using var app = TestApp.Create(database: Guid.NewGuid().ToString());
        using var client = app.CreateClient();

        Assert.Equal(HttpStatusCode.BadRequest, (await LoginAsync(client, new string('a', 51))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(client, new string('a', 50))).StatusCode);
    }

    [Fact]
    public async Task DemoLogin_KeepsItsFivePerMinuteLimit()
    {
        using var app = TestApp.Create(database: Guid.NewGuid().ToString());
        using var client = app.CreateClient();

        for (var attempt = 0; attempt < 5; attempt++)
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await client.PostAsJsonAsync("/api/auth/demo-login", new { role = "DemoAdmin" })).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests,
            (await client.PostAsJsonAsync("/api/auth/demo-login", new { role = "DemoAdmin" })).StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(client, "someone-else")).StatusCode);
    }

    [Fact]
    public async Task AuthenticatedPasswordChange_KeepsItsFivePerMinuteLimit()
    {
        using var app = TestApp.Create(database: Guid.NewGuid().ToString());
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var user = new UserEntity { Name = "admin", Role = UserRole.Admin };
            user.PasswordHash = new PasswordHasher<UserEntity>().HashPassword(user, "correct-password");
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        using var client = app.CreateClient();
        using var signedIn = await client.PostAsJsonAsync("/api/auth/login", new
        {
            name = "admin", password = "correct-password"
        });
        Assert.Equal(HttpStatusCode.OK, signedIn.StatusCode);
        var token = (await signedIn.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString();

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        for (var attempt = 0; attempt < 5; attempt++)
            Assert.Equal(HttpStatusCode.BadRequest,
                (await client.PostAsJsonAsync("/api/auth/change-password", new
                {
                    currentPassword = "wrong-password", newPassword = "some-new-password"
                })).StatusCode);

        Assert.Equal(HttpStatusCode.TooManyRequests,
            (await client.PostAsJsonAsync("/api/auth/change-password", new
            {
                currentPassword = "wrong-password", newPassword = "some-new-password"
            })).StatusCode);
    }

    [Fact]
    public async Task OneAddress_GetsTwentySignInsAMinuteAcrossUsernames()
    {
        using var app = TestApp.Create(database: Guid.NewGuid().ToString());
        using var client = app.CreateClient();

        for (var attempt = 0; attempt < 20; attempt++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(client, $"user{attempt}")).StatusCode);
        using var limited = await LoginAsync(client, "user20");

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.NotNull(limited.Headers.RetryAfter);
    }
}
