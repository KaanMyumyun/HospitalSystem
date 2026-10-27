using HospitalSystem.Services;

namespace HospitalSystem.Tests;

// A clinic clock for tests: UTC unless a test is about the clinic's zone.
public static class TestClinic
{
    public static ClinicClock Utc(TimeProvider? time = null) => In("UTC", time);

    public static ClinicClock In(string timeZoneId, TimeProvider? time = null) =>
        ClinicClock.For(timeZoneId, time ?? TimeProvider.System)
        ?? throw new ArgumentException($"No time zone named {timeZoneId}", nameof(timeZoneId));
}
