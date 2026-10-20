using HospitalSystem.Services.Auth;
using Microsoft.Extensions.Caching.Memory;
using Xunit;

namespace HospitalSystem.Tests;

public class SecurityStampCacheTests : AuthTestBase
{
    private static SecurityStampCache CreateCache() => new(new MemoryCache(new MemoryCacheOptions()));

    [Fact]
    public async Task GetAsync_ReturnsTheUsersStamp()
    {
        var db = CreateDbContext();
        var user = await SeedUserAsync(db);
        var cache = CreateCache();

        Assert.Equal(user.SecurityStamp, await cache.GetAsync(db, user.Id));
    }

    [Fact]
    public async Task GetAsync_KeepsTheStampItRead()
    {
        var db = CreateDbContext();
        var user = await SeedUserAsync(db);
        var cache = CreateCache();
        var originalStamp = await cache.GetAsync(db, user.Id);

        user.SecurityStamp = "rotated elsewhere";
        await db.SaveChangesAsync();

        Assert.Equal(originalStamp, await cache.GetAsync(db, user.Id));
    }

    [Fact]
    public async Task Forget_MakesTheNextCallReadTheNewStamp()
    {
        var db = CreateDbContext();
        var user = await SeedUserAsync(db);
        var cache = CreateCache();
        await cache.GetAsync(db, user.Id);

        user.SecurityStamp = "rotated here";
        await db.SaveChangesAsync();
        cache.Forget(user.Id);

        Assert.Equal("rotated here", await cache.GetAsync(db, user.Id));
    }

    [Fact]
    public async Task GetAsync_UnknownUser_ReturnsNullAndDoesNotKeepIt()
    {
        var db = CreateDbContext();
        var cache = CreateCache();

        Assert.Null(await cache.GetAsync(db, 1));

        var user = await SeedUserAsync(db);
        Assert.Equal(user.SecurityStamp, await cache.GetAsync(db, user.Id));
    }
}
