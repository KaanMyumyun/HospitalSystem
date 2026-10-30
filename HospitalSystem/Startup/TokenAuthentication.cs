using System.Security.Claims;
using System.Text;
using HospitalSystem.Services.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace HospitalSystem.Startup;

public static class TokenAuthentication
{
    // Keys anyone can read: the placeholder once committed to appsettings.json
    // and the templates' example value.
    private static readonly string[] PublishedJwtKeys =
    [
        "THIS_SHOULD_BE_LONG_AND_SECRET_123456789",
        "replace-with-a-random-string-of-at-least-32-characters"
    ];

    // Bearer tokens signed with JwtSettings:SecretKey. The API refuses to
    // start with a key that is missing, too short or published, and a token
    // stops working once its user's security stamp changes.
    public static IServiceCollection AddTokenAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtSecret = configuration["JwtSettings:SecretKey"];
        if (string.IsNullOrWhiteSpace(jwtSecret))
            throw new InvalidOperationException("JWT SecretKey is not configured");
        // Tokens are signed with HMAC-SHA256, which needs a 256-bit key. A shorter
        // key would start fine and then fail every sign-in.
        if (Encoding.UTF8.GetByteCount(jwtSecret) < 32)
            throw new InvalidOperationException("JWT SecretKey must be at least 32 bytes (256 bits) long");
        if (PublishedJwtKeys.Contains(jwtSecret.Trim()))
            throw new InvalidOperationException("JWT SecretKey is a published example value; generate a random key of your own");

        services.AddAuthentication("Bearer")
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    // Not the default five minutes: an expired token stops working
                    // within 30 seconds, which still covers small clock differences
                    // between API instances.
                    ClockSkew = TimeSpan.FromSeconds(30),
                    ValidIssuer = configuration["JwtSettings:Issuer"],
                    ValidAudience = configuration["JwtSettings:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
                };
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async context =>
                    {
                        var userIdClaim = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                        var stampClaim = context.Principal?.FindFirst(SecurityStampClaims.ClaimType)?.Value;

                        if (!int.TryParse(userIdClaim, out var userId))
                        {
                            context.Fail("Invalid token");
                            return;
                        }

                        var requestServices = context.HttpContext.RequestServices;
                        var currentStamp = await requestServices.GetRequiredService<SecurityStampCache>().GetAsync(
                            requestServices.GetRequiredService<ApplicationDbContext>(), userId, context.HttpContext.RequestAborted);

                        if (currentStamp == null || currentStamp != stampClaim)
                            context.Fail("Token has been revoked");
                    }
                };
            });

        return services;
    }
}
