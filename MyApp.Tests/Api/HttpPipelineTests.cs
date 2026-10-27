using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using HospitalSystem.Interfaces.Auth;
using HospitalSystem.Interfaces.Department;
using HospitalSystem.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Moq;

namespace HospitalSystem.Tests;

// Whole requests through the real pipeline, with an in-memory database:
// authentication and token checks, rate limits, client addresses behind a
// proxy, status codes and the exception handler.
public class HttpPipelineTests
{
    private const string Password = "correct-horse-battery";

    private sealed record Started(WebApplicationFactory<Program> App, UserEntity Admin, UserEntity Desk) : IAsyncDisposable
    {
        public ValueTask DisposeAsync() => App.DisposeAsync();
    }

    private static async Task<Started> StartAsync(
        IDictionary<string, string?>? settings = null, Action<IServiceCollection>? services = null)
    {
        var app = TestApp.Create(database: Guid.NewGuid().ToString(), settings: settings, configureServices: services);
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var hasher = new PasswordHasher<UserEntity>();
        var admin = new UserEntity { Name = "admin", Role = UserRole.Admin };
        admin.PasswordHash = hasher.HashPassword(admin, Password);
        var desk = new UserEntity { Name = "desk", Role = UserRole.FrontDesk };
        desk.PasswordHash = hasher.HashPassword(desk, Password);
        db.Users.AddRange(admin, desk);
        db.Departments.Add(new DepartmentEntity { Id = 1, Name = "Cardiology", IsActive = true });
        await db.SaveChangesAsync();
        return new Started(app, admin, desk);
    }

    private static async Task<HttpResponseMessage> SignInAsync(HttpClient client, string name, string password, string? forwardedFor = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new { name, password })
        };
        if (forwardedFor is not null)
            request.Headers.Add("X-Forwarded-For", forwardedFor);
        return await client.SendAsync(request);
    }

    private static async Task<string> TokenAsync(HttpClient client, string name, string password = Password)
    {
        var response = await SignInAsync(client, name, password);
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("token").GetString()!;
    }

    private static HttpClient Authorized(WebApplicationFactory<Program> app, string token)
    {
        var client = app.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    // A token signed like the API's own, with the parts a test wants wrong.
    private static string MakeToken(UserEntity user, DateTime expires, string key = TestApp.JwtKey,
        string issuer = "HospitalSystem", string audience = "HospitalSystemUsers")
    {
        var claims = new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim(SecurityStampClaims.ClaimType, user.SecurityStamp)
        ]);
        var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
        return new JwtSecurityTokenHandler().CreateEncodedJwt(
            issuer, audience, claims, notBefore: expires.AddHours(-1), expires: expires, issuedAt: expires.AddHours(-1), credentials);
    }

    [Fact]
    public async Task EveryEndpointButSignInAndHealth_RejectsAnonymousRequests()
    {
        await using var started = await StartAsync();
        var client = started.App.CreateClient();
        var endpoints = started.App.Services.GetRequiredService<EndpointDataSource>().Endpoints
            .OfType<RouteEndpoint>()
            .Where(e => e.Metadata.GetMetadata<IAllowAnonymous>() is null)
            .ToList();

        Assert.True(endpoints.Count >= 20, $"only {endpoints.Count} protected endpoints found");
        foreach (var endpoint in endpoints)
        {
            var path = "/" + Regex.Replace(endpoint.RoutePattern.RawText!, @"\{[^}]+\}", "1");
            foreach (var method in endpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? ["GET"])
            {
                using var request = new HttpRequestMessage(new HttpMethod(method), path);
                if (method != "GET")
                    request.Content = JsonContent.Create(new { });

                var response = await client.SendAsync(request);

                Assert.True(response.StatusCode == HttpStatusCode.Unauthorized,
                    $"{method} {path} answered {(int)response.StatusCode} without a token");
            }
        }
    }

    // Whatever roles an endpoint lists, it requires DemoReadOnly too, so no
    // endpoint, now or later, lets a demo account change data.
    [Fact]
    public async Task EveryEndpointButSignInAndHealth_RequiresTheDemoReadOnlyPolicy()
    {
        await using var started = await StartAsync();
        var endpoints = started.App.Services.GetRequiredService<EndpointDataSource>().Endpoints
            .OfType<RouteEndpoint>()
            .Where(e => e.Metadata.GetMetadata<IAllowAnonymous>() is null)
            .ToList();

        Assert.True(endpoints.Count >= 20, $"only {endpoints.Count} protected endpoints found");
        Assert.All(endpoints, endpoint =>
            Assert.Contains(endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>(), data => data.Policy == DemoReadOnly.Policy));
    }

    [Fact]
    public async Task ADemoAccount_CanReadButNotChange()
    {
        var changePassword = new Mock<IChangePasswordService>();
        await using var started = await StartAsync(
            new Dictionary<string, string?> { ["Demo:Enabled"] = "true" },
            services => services.AddScoped(_ => changePassword.Object));
        using (var scope = started.App.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Users.Add(new UserEntity { Name = "DemoAdmin", PasswordHash = "x", Role = UserRole.DemoAdmin });
            await db.SaveChangesAsync();
        }
        var signIn = await started.App.CreateClient().PostAsJsonAsync("/api/auth/demo-login", new { role = "DemoAdmin" });
        signIn.EnsureSuccessStatusCode();
        var demo = Authorized(started.App, (await signIn.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString()!);

        Assert.Equal(HttpStatusCode.OK, (await demo.GetAsync("/api/departments")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await demo.PostAsJsonAsync("/api/departments", new { name = "Neurology" })).StatusCode);
        // Open to any signed-in user, so only the policy keeps a demo account out.
        var change = await demo.PostAsJsonAsync("/api/auth/change-password",
            new { currentPassword = "anything-at-all", newPassword = "something-else" });

        Assert.Equal(HttpStatusCode.Forbidden, change.StatusCode);
        changePassword.Verify(s => s.ChangeOwnPasswordAsync(It.IsAny<ChangePasswordDto>(), It.IsAny<CancellationToken>()), Times.Never);
        using var check = started.App.Services.CreateScope();
        Assert.Single(check.ServiceProvider.GetRequiredService<ApplicationDbContext>().Departments);
    }

    [Fact]
    public async Task ATokenFromSignIn_OpensTheEndpointsOfItsRole()
    {
        await using var started = await StartAsync();
        var client = started.App.CreateClient();

        var admin = Authorized(started.App, await TokenAsync(client, "ADMIN"));
        var desk = Authorized(started.App, await TokenAsync(client, "desk"));

        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync("/api/users")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await desk.GetAsync("/api/users")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await desk.GetAsync("/api/departments")).StatusCode);
    }

    [Theory]
    [InlineData("signature")]
    [InlineData("issuer")]
    [InlineData("audience")]
    [InlineData("expired")]
    public async Task ATokenWithAnyPartWrong_IsRejected(string wrongPart)
    {
        await using var started = await StartAsync();
        var inAnHour = DateTime.UtcNow.AddHours(1);
        var token = wrongPart switch
        {
            "signature" => MakeToken(started.Admin, inAnHour, key: "another-signing-key-that-is-32-bytes"),
            "issuer" => MakeToken(started.Admin, inAnHour, issuer: "SomeoneElse"),
            "audience" => MakeToken(started.Admin, inAnHour, audience: "SomeoneElse"),
            _ => MakeToken(started.Admin, DateTime.UtcNow.AddMinutes(-1))
        };

        var response = await Authorized(started.App, token).GetAsync("/api/users");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // Clocks on two API instances can differ slightly, so a token is still
    // accepted for 30 seconds after it expires; no longer than that.
    [Fact]
    public async Task AnExpiredToken_HasThirtySecondsOfGrace()
    {
        await using var started = await StartAsync();

        var justExpired = MakeToken(started.Admin, DateTime.UtcNow.AddSeconds(-10));

        Assert.Equal(HttpStatusCode.OK, (await Authorized(started.App, justExpired).GetAsync("/api/users")).StatusCode);
    }

    // The token names its user, so a change is audited with who made it: the
    // id, and the username as stored, whatever case was typed at sign-in.
    [Fact]
    public async Task AChange_IsAuditedWithTheUsersIdAndName()
    {
        await using var started = await StartAsync();
        var admin = Authorized(started.App, await TokenAsync(started.App.CreateClient(), "ADMIN"));

        (await admin.PostAsJsonAsync("/api/departments", new { name = "Neurology" })).EnsureSuccessStatusCode();

        using var scope = started.App.Services.CreateScope();
        var entry = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().AuditLogs.Single(a => a.Action == "CreateDepartment");
        Assert.Equal(started.Admin.Id, entry.ActorUserId);
        Assert.Equal("admin", entry.ActorName);
    }

    [Fact]
    public async Task ChangingThePassword_RevokesEarlierTokens()
    {
        await using var started = await StartAsync();
        var oldToken = await TokenAsync(started.App.CreateClient(), "admin");

        var change = await Authorized(started.App, oldToken).PostAsJsonAsync("/api/auth/change-password",
            new { currentPassword = Password, newPassword = "a-different-password" });
        change.EnsureSuccessStatusCode();
        var newToken = (await change.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString()!;

        Assert.Equal(HttpStatusCode.Unauthorized, (await Authorized(started.App, oldToken).GetAsync("/api/users")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Authorized(started.App, newToken).GetAsync("/api/users")).StatusCode);
    }

    [Fact]
    public async Task TheSixthSignInInAMinute_GetsA429WithRetryAfter()
    {
        await using var started = await StartAsync();
        var client = started.App.CreateClient();

        for (var attempt = 0; attempt < 5; attempt++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await SignInAsync(client, "admin", "wrong")).StatusCode);
        var limited = await SignInAsync(client, "admin", Password);

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.True(limited.Headers.RetryAfter?.Delta > TimeSpan.Zero);
        Assert.Contains("Too many requests", (await limited.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("error").GetString());
    }

    // Without a trusted proxy the header is the client's own claim, so it must
    // not give anyone a fresh limit.
    [Fact]
    public async Task ByDefault_XForwardedForDoesNotChangeTheLimit()
    {
        await using var started = await StartAsync();
        var client = started.App.CreateClient();

        for (var attempt = 0; attempt < 5; attempt++)
            await SignInAsync(client, "admin", "wrong", forwardedFor: "203.0.113.1");

        Assert.Equal(HttpStatusCode.TooManyRequests, (await SignInAsync(client, "admin", "wrong", "203.0.113.2")).StatusCode);
    }

    [Fact]
    public async Task BehindATrustedProxy_EachClientAddressHasItsOwnLimit()
    {
        await using var started = await StartAsync(new Dictionary<string, string?>
        {
            ["ForwardedHeaders:TrustAllProxies"] = "true"
        });
        var client = started.App.CreateClient();

        for (var attempt = 0; attempt < 5; attempt++)
            await SignInAsync(client, "admin", "wrong", forwardedFor: "203.0.113.1");

        Assert.Equal(HttpStatusCode.TooManyRequests, (await SignInAsync(client, "admin", "wrong", "203.0.113.1")).StatusCode);
        // With one proxy only the last entry counts: anything a client put in
        // front of it is ignored, so it cannot pick a fresh address.
        Assert.Equal(HttpStatusCode.TooManyRequests, (await SignInAsync(client, "admin", "wrong", "198.51.100.9, 203.0.113.1")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await SignInAsync(client, "admin", "wrong", "203.0.113.2")).StatusCode);
    }

    [Fact]
    public async Task Refusals_GetTheStatusCodeOfTheirKind()
    {
        await using var started = await StartAsync();
        var admin = Authorized(started.App, await TokenAsync(started.App.CreateClient(), "admin"));

        var missing = await admin.PatchAsJsonAsync("/api/departments/999/status", new { isActive = false });
        var duplicate = await admin.PostAsJsonAsync("/api/departments", new { name = "cardiology" });
        var invalid = await admin.PatchAsJsonAsync("/api/departments/1/status", new { });

        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        Assert.Equal("Department not found", (await missing.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("error").GetString());
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        Assert.Contains("IsActive", await invalid.Content.ReadAsStringAsync());
    }

    // The id in the path is the one acted on; an id in the body is ignored.
    [Fact]
    public async Task TheIdInThePath_WinsOverOneInTheBody()
    {
        await using var started = await StartAsync();
        var admin = Authorized(started.App, await TokenAsync(started.App.CreateClient(), "admin"));

        var response = await admin.PatchAsJsonAsync("/api/departments/1/status", new { departmentId = 999, isActive = false });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = started.App.Services.CreateScope();
        Assert.False(scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Departments.Single().IsActive);
    }

    [Fact]
    public async Task AnUnhandledException_GetsA500WithoutItsDetails()
    {
        var failing = new Mock<IDepartmentQueryService>();
        failing.Setup(s => s.ListDepartmentsAsync(It.IsAny<CancellationToken>())).ThrowsAsync(new InvalidOperationException("secret detail"));
        await using var started = await StartAsync(services: services =>
            services.AddScoped(_ => failing.Object));
        var admin = Authorized(started.App, await TokenAsync(started.App.CreateClient(), "admin"));

        var response = await admin.GetAsync("/api/departments");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Something went wrong", body);
        Assert.DoesNotContain("secret detail", body);
    }
}
