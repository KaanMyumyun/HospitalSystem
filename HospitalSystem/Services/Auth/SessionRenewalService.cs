using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HospitalSystem.Services.Auth;

// Swaps a signed-in user's token for a new one, so that a session in use does
// not end after an hour. A revoked token never gets here: the stamp check on
// every request refuses it first.
public class SessionRenewalService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IOptions<JwtSettings> jwtOptions,
    TimeProvider clock,
    ClinicClock clinic) : ISessionRenewalService
{
    private readonly JwtSettings _jwtSettings = jwtOptions.Value;

    public async Task<LoginResultDto> RenewAsync(CancellationToken cancellationToken = default)
    {
        // Tokens issued before renewal existed do not say when their session
        // began, so they run out as they always did.
        if (!int.TryParse(currentUser.UserId, out var userId) || currentUser.SignedInAt is not { } signedInAt)
            return LoginResultDto.Fail("Sign in again to carry on");

        var now = clock.GetUtcNow();
        var sessionEnds = signedInAt + SessionTokens.MaxSessionLength;
        if (now >= sessionEnds)
            return LoginResultDto.Fail("Sign in again: a session lasts at most 12 hours");

        var user = await context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
            return LoginResultDto.Fail("Sign in again to carry on");

        var expires = now + SessionTokens.Lifetime < sessionEnds ? now + SessionTokens.Lifetime : sessionEnds;
        return LoginResultDto.Success(SessionTokens.Issue(user, _jwtSettings, signedInAt, expires), user.Role, clinic.TimeZoneId);
    }
}
