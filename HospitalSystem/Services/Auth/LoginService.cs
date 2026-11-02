using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Auth;

namespace HospitalSystem.Services.Auth;

public class LoginService(
    ApplicationDbContext context,
    IOptions<JwtSettings> jwtOptions,
    IOptions<DemoSettings> demoOptions,
    IAuditLogService auditLog,
    IPasswordHasher<UserEntity> hasher,
    TimeProvider clock,
    ClinicClock clinic) : ILoginService
{
    private readonly JwtSettings _jwtSettings = jwtOptions.Value;
    private readonly DemoSettings _demoSettings = demoOptions.Value;

    private static string? _dummyPasswordHash;
    private string DummyPasswordHash =>
        _dummyPasswordHash ??= hasher.HashPassword(new UserEntity(), Guid.NewGuid().ToString());

    public async Task<LoginResultDto> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Password))
            return LoginResultDto.Fail("Invalid credentials");

        var nameKey = dto.Name.Trim().ToLowerInvariant();
        var found = await context.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(u => u.Name.ToLower() == nameKey, cancellationToken);

        if (found == null)
        {
            hasher.VerifyHashedPassword(new UserEntity(), DummyPasswordHash, dto.Password);
            return await RefuseAsync(null, "Failed sign-in with an unknown username", cancellationToken);
        }

        var now = clock.GetUtcNow().UtcDateTime;
        if (SignInLockout.IsLocked(found, now))
        {
            hasher.VerifyHashedPassword(new UserEntity(), DummyPasswordHash, dto.Password);
            return await RefuseAsync(found, $"Sign-in refused for user {found.Name}: account locked", cancellationToken);
        }

        var verification = hasher.VerifyHashedPassword(found, found.PasswordHash, dto.Password);

        await using var transaction = context.Database.IsNpgsql()
            ? await context.Database.BeginTransactionAsync(cancellationToken)
            : null;
        var result = await LoginWithLockedUserAsync(found, verification, dto.Password, now, cancellationToken);
        if (transaction is not null)
            await transaction.CommitAsync(cancellationToken);
        return result;
    }

    private async Task<LoginResultDto> LoginWithLockedUserAsync(
        UserEntity found, PasswordVerificationResult verification, string password, DateTime now, CancellationToken cancellationToken)
    {
        var user = await SignInLockout.FindByIdForUpdateAsync(context, found.Id, cancellationToken);
        if (user == null)
            return await RefuseAsync(null, "Failed sign-in with an unknown username", cancellationToken);

        if (SignInLockout.IsLocked(user, now))
            return await RefuseAsync(user, $"Sign-in refused for user {user.Name}: account locked", cancellationToken);

        if (user.PasswordHash != found.PasswordHash)
            verification = hasher.VerifyHashedPassword(user, user.PasswordHash, password);

        if (verification == PasswordVerificationResult.Failed)
        {
            if (!SignInLockout.RecordFailure(user, now))
                return await RefuseAsync(user, $"Failed sign-in for user {user.Name}: wrong password", cancellationToken);

            await auditLog.LogAsync("SignInLocked", "User", user.Id, SignInLockout.LockedAuditDetails(user), cancellationToken);
            return await RefuseAsync(user, $"Failed sign-in for user {user.Name}: wrong password", cancellationToken);
        }

        if (SignInLockout.Clear(user))
            await context.SaveChangesAsync(cancellationToken);

        if (user.Role is UserRole.DemoAdmin or UserRole.DemoFrontDesk)
            return await RefuseAsync(
                user, $"Failed sign-in for user {user.Name}: demo accounts have no password sign-in", cancellationToken);

        if (user.Role == UserRole.Pending)
            return await RefuseAsync(
                user, $"Sign-in refused for user {user.Name}: account awaiting approval", "Account awaiting approval", cancellationToken);

        var token = SessionTokens.Issue(user, _jwtSettings, clock.GetUtcNow());

        return LoginResultDto.Success(token, user.Role, clinic.TimeZoneId);
    }

    public async Task<LoginResultDto> DemoLoginAsync(UserRole role, CancellationToken cancellationToken = default)
    {
        if (!_demoSettings.Enabled)
            return LoginResultDto.Fail("Demo login is not available");

        var userName = role switch
        {
            UserRole.DemoAdmin => _demoSettings.AdminUserName,
            UserRole.DemoFrontDesk => _demoSettings.FrontDeskUserName,
            _ => null
        };

        if (string.IsNullOrWhiteSpace(userName))
            return LoginResultDto.Fail("Invalid credentials");

        var nameKey = userName.ToLowerInvariant();
        var user = await context.Users
            .SingleOrDefaultAsync(u => u.Name.ToLower() == nameKey && u.Role == role, cancellationToken);

        if (user == null)
            return LoginResultDto.Fail("Invalid credentials");

        var token = SessionTokens.Issue(user, _jwtSettings, clock.GetUtcNow());

        return LoginResultDto.Success(token, user.Role, clinic.TimeZoneId);
    }

    private Task<LoginResultDto> RefuseAsync(UserEntity? user, string details, CancellationToken cancellationToken) =>
        RefuseAsync(user, details, "Invalid credentials", cancellationToken);

    private async Task<LoginResultDto> RefuseAsync(UserEntity? user, string details, string error, CancellationToken cancellationToken)
    {
        await auditLog.LogAsync("SignInFailed", "User", user?.Id ?? 0, details, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        return LoginResultDto.Fail(error);
    }
}
