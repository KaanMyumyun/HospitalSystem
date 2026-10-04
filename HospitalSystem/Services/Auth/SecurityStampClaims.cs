using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Auth;

public static class SecurityStampClaims
{
    public const string ClaimType = "security_stamp";

    // The stamp a user's tokens must carry, or null if the user is gone. Token
    // validation and the startup warm-up share it so they run the same query.
    public static Task<string?> CurrentStampAsync(ApplicationDbContext db, int userId) =>
        db.Users
            .Where(u => u.Id == userId)
            .Select(u => (string?)u.SecurityStamp)
            .FirstOrDefaultAsync();
}
