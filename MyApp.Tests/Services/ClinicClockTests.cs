using System.Globalization;
using HospitalSystem.Services;

namespace HospitalSystem.Tests;

public class ClinicClockTests
{
    [Theory]
    [InlineData("2026-01-15T07:00:00Z")]
    [InlineData("2026-07-15T06:00:00Z")]
    [InlineData("2026-07-15T09:00:00+03:00")]
    public void WallClock_IsTheClinicsTime(string instant)
    {
        var clinic = TestClinic.In("Europe/Sofia");

        Assert.Equal(9, clinic.WallClock(DateTimeOffset.Parse(instant, CultureInfo.InvariantCulture)).Hour);
    }

    [Fact]
    public void ToUtc_IsTheInstantOfAClinicTime()
    {
        var clinic = TestClinic.In("Europe/Sofia");

        Assert.Equal(new DateTime(2026, 1, 15, 7, 0, 0, DateTimeKind.Utc), clinic.ToUtc(new DateTime(2026, 1, 15, 9, 0, 0)));
    }

    [Fact]
    public void ToUtc_ATimeTheClocksSkip_IsTheFirstTimeAfterTheGap()
    {
        var clinic = TestClinic.In("Europe/Sofia");

        Assert.Equal(new DateTime(2026, 3, 29, 1, 0, 0, DateTimeKind.Utc), clinic.ToUtc(new DateTime(2026, 3, 29, 3, 30, 0)));
    }

    [Fact]
    public void Today_IsTheClinicsDate()
    {
        var clinic = TestClinic.In("Europe/Sofia", new FixedClock(new DateTimeOffset(2026, 1, 15, 22, 30, 0, TimeSpan.Zero)));

        Assert.Equal(new DateOnly(2026, 1, 16), clinic.Today);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Mars/Olympus_Mons")]
    public void For_AZoneThatDoesNotExist_IsNull(string? timeZoneId)
    {
        Assert.Null(ClinicClock.For(timeZoneId, TimeProvider.System));
    }
}
