namespace HospitalSystem.Services;

public sealed class ClinicClock(string timeZoneId, TimeZoneInfo zone, TimeProvider time)
{
    public string TimeZoneId { get; } = timeZoneId;

    public DateTime WallClock(DateTimeOffset instant) => TimeZoneInfo.ConvertTime(instant, zone).DateTime;

    public DateTime WallClock(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), zone);

    public DateTime ToUtc(DateTime wallClock)
    {
        var local = DateTime.SpecifyKind(wallClock, DateTimeKind.Unspecified);
        while (zone.IsInvalidTime(local))
            local = local.AddMinutes(15);
        return TimeZoneInfo.ConvertTimeToUtc(local, zone);
    }

    public DateOnly Today => DateOnly.FromDateTime(WallClock(time.GetUtcNow()));

    public static ClinicClock? For(string? timeZoneId, TimeProvider time) =>
        !string.IsNullOrWhiteSpace(timeZoneId) && TimeZoneInfo.TryFindSystemTimeZoneById(timeZoneId, out var zone)
            ? new ClinicClock(timeZoneId, zone, time)
            : null;
}
