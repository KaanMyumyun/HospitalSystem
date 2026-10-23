namespace HospitalSystem.Tests;

// A clock that says whatever time a test needs, and moves only when told to.
public sealed class FixedClock(DateTimeOffset now) : TimeProvider
{
    public DateTimeOffset Now { get; set; } = now;

    public override DateTimeOffset GetUtcNow() => Now;
}
