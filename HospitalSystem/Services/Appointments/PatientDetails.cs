using System.Text.RegularExpressions;

namespace HospitalSystem.Services.Appointments;

// The phone number rules shared by booking and by editing a patient.
internal static class PatientDetails
{
    private static readonly Regex AllowedPhoneCharacters = new(@"^\+?[0-9\s().-]+$", RegexOptions.Compiled);

    // Null when the number is acceptable.
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

    // Patients are stored and matched by digits only, keeping a leading +, so
    // "+359 888 111-222" and "+359888111222" are the same number.
    public static string NormalizePhoneNumber(string? phoneNumber)
    {
        var trimmed = phoneNumber?.Trim() ?? "";
        var digits = string.Concat(trimmed.Where(char.IsAsciiDigit));
        return trimmed.StartsWith('+') ? "+" + digits : digits;
    }
}
