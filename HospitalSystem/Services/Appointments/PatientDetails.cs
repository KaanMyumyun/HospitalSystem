using System.Text.RegularExpressions;

namespace HospitalSystem.Services.Appointments;

internal static class PatientDetails
{
    private static readonly Regex AllowedPhoneCharacters = new(@"^\+?[0-9\s().-]+$", RegexOptions.Compiled);

    public static string? PhoneNumberError(string? phoneNumber)
    {
        var trimmed = phoneNumber?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            return "Phone number is required";

        var digitCount = trimmed.Count(char.IsDigit);
        if (!AllowedPhoneCharacters.IsMatch(trimmed) || digitCount < 7 || digitCount > 15)
            return "Phone number must contain 7 to 15 digits and no letters";

        return null;
    }

    public static string NormalizePhoneNumber(string? phoneNumber)
    {
        var trimmed = phoneNumber?.Trim() ?? "";
        var digits = string.Concat(trimmed.Where(char.IsAsciiDigit));
        return trimmed.StartsWith('+') ? "+" + digits : digits;
    }
}
