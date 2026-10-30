using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace HospitalSystem.Services.Auth;

public static class SessionTokens
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(1);
    public static readonly TimeSpan MaxSessionLength = TimeSpan.FromHours(12);

    public const string SignedInAtClaimType = "signed_in_at";

    public static string Issue(UserEntity user, JwtSettings jwtSettings, DateTimeOffset now) =>
        Issue(user, jwtSettings, signedInAt: now, expires: now + Lifetime);

    public static string Issue(UserEntity user, JwtSettings jwtSettings, DateTimeOffset signedInAt, DateTimeOffset expires)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
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
