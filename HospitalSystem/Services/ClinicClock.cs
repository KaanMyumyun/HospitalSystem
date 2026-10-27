namespace HospitalSystem.Services;

// The clinic's wall clock. Working days and hours, breaks and time off are
// clinic times, whatever time zone the computer at the desk is set to. The
// zone comes from Clinic:TimeZone.
public sealed class ClinicClock(string timeZoneId, TimeZoneInfo zone, TimeProvider time)
{
    // The IANA name, such as Europe/Sofia, which the frontend uses too.
    public string TimeZoneId { get; } = timeZoneId;

    public DateTime WallClock(DateTimeOffset instant) => TimeZoneInfo.ConvertTime(instant, zone).DateTime;

    public DateTime WallClock(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), zone);

    // The instant a clinic date and time happen. A time the clocks skip when
    // they go forward is taken as the first one after the gap.
    public DateTime ToUtc(DateTime wallClock)
    {
        var local = DateTime.SpecifyKind(wallClock, DateTimeKind.Unspecified);
        while (zone.IsInvalidTime(local))
            local = local.AddMinutes(15);
        return TimeZoneInfo.ConvertTimeToUtc(local, zone);
    }

    public DateOnly Today => DateOnly.FromDateTime(WallClock(time.GetUtcNow()));

    // For a zone given by name, as Clinic:TimeZone is. Null when there is no
    // such zone.
    public static ClinicClock? For(string? timeZoneId, TimeProvider time) =>
        !string.IsNullOrWhiteSpace(timeZoneId) && TimeZoneInfo.TryFindSystemTimeZoneById(timeZoneId, out var zone)
            ? new ClinicClock(timeZoneId, zone, time)
            : null;
}
