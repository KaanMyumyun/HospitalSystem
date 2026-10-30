using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Auth;

public static class SecurityStampClaims
{
    public const string ClaimType = "security_stamp";

    public static Task<string?> CurrentStampAsync(
        ApplicationDbContext db, int userId, CancellationToken cancellationToken = default) =>
        db.Users
            .Where(u => u.Id == userId)
            .Select(u => (string?)u.SecurityStamp)
            .FirstOrDefaultAsync(cancellationToken);
}
