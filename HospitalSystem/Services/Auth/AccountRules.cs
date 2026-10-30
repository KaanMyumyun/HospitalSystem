using System.Text.RegularExpressions;

namespace HospitalSystem.Services.Auth;

internal static class AccountRules
{
    private static readonly Regex ValidUsername = new(@"^[A-Za-z][A-Za-z0-9_.-]{2,39}$", RegexOptions.Compiled);

    public static string? UsernameError(string name) =>
        ValidUsername.IsMatch(name)
            ? null
            : "Username must start with a letter and use only letters, numbers, dots, hyphens, or underscores";

    public static string? PasswordError(string password) =>
        password.Length < 8 ? "Password must be at least 8 characters long" : null;
}
