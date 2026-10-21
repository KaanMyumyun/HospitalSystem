namespace HospitalSystem.Services.Calendar;

// The days of the week a doctor works, kept Monday first and without repeats.
public static class ScheduleDays
{
    public static List<DayOfWeek> Normalize(IEnumerable<DayOfWeek> days) =>
        days.Distinct().OrderBy(day => ((int)day + 6) % 7).ToList();

    // Null means "not given" and is valid; an empty list is not.
    public static string? Validate(IReadOnlyCollection<DayOfWeek>? days)
    {
        if (days is null)
            return null;

        if (days.Count == 0)
            return "Choose at least one working day";

        if (days.Any(day => !Enum.IsDefined(day)))
            return "Working days must be days of the week";

        return null;
    }
}
