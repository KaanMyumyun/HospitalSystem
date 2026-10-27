using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace HospitalSystem.Services.Auth;

// A token lasts an hour. While the user keeps working, the frontend swaps it
// for a new one (POST /api/auth/refresh), for up to 12 hours after they signed
// in; then they sign in again.
public static class SessionTokens
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(1);
    public static readonly TimeSpan MaxSessionLength = TimeSpan.FromHours(12);

    // When the session began, in Unix seconds. A renewal carries it over.
    public const string SignedInAtClaimType = "signed_in_at";

    // A token for a session that begins now.
    public static string Issue(UserEntity user, JwtSettings jwtSettings, DateTimeOffset now) =>
        Issue(user, jwtSettings, signedInAt: now, expires: now + Lifetime);

    public static string Issue(UserEntity user, JwtSettings jwtSettings, DateTimeOffset signedInAt, DateTimeOffset expires)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            // For the audit log, which records who made a change by name.
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Role, user.Role.ToString()),
            new(SecurityStampClaims.ClaimType, user.SecurityStamp),
            new(SignedInAtClaimType, signedInAt.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture), ClaimValueTypes.Integer64)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey));
        var token = new JwtSecurityToken(
            issuer: jwtSettings.Issuer,
            audience: jwtSettings.Audience,
            claims: claims,
            expires: expires.UtcDateTime,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
