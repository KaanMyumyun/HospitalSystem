using System.Security.Claims;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Auth;

namespace HospitalSystem.Services.Auth;

public class LoginService(
    ApplicationDbContext context,
    IOptions<JwtSettings> jwtOptions,
    IOptions<DemoSettings> demoOptions,
    IAuditLogService auditLog,
    IPasswordHasher<UserEntity> hasher,
    TimeProvider clock) : ILoginService
{
    private readonly JwtSettings _jwtSettings = jwtOptions.Value;
    private readonly DemoSettings _demoSettings = demoOptions.Value;

    // Checked for an unknown username, so a failed sign-in takes the same time
    // whether or not the account exists. Made by the same hasher as real ones.
    private static string? _dummyPasswordHash;
    private string DummyPasswordHash =>
        _dummyPasswordHash ??= hasher.HashPassword(new UserEntity(), Guid.NewGuid().ToString());

    public async Task<LoginResultDto> LoginAsync(LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Password))
            return LoginResultDto.Fail("Invalid credentials");

        await using var transaction = context.Database.IsNpgsql()
            ? await context.Database.BeginTransactionAsync()
            : null;
        var result = await LoginWithLockedUserAsync(dto);
        if (transaction is not null)
            await transaction.CommitAsync();
        return result;
    }

    private async Task<LoginResultDto> LoginWithLockedUserAsync(LoginDto dto)
    {
        // Usernames ignore case: "Admin" and "admin" are the same account.
        var nameKey = dto.Name.Trim().ToLowerInvariant();
        var user = await SignInLockout.FindByNameForUpdateAsync(context, nameKey);

        if (user == null)
        {
            hasher.VerifyHashedPassword(new UserEntity(), DummyPasswordHash, dto.Password);
            return await RefuseAsync(null, "Failed sign-in with an unknown username");
        }

        var now = clock.GetUtcNow().UtcDateTime;
        if (SignInLockout.IsLocked(user, now))
        {
            // A locked account must look like any other failed sign-in to an
            // anonymous caller, including the password-verification cost.
            hasher.VerifyHashedPassword(new UserEntity(), DummyPasswordHash, dto.Password);
            return await RefuseAsync(user, $"Sign-in refused for user {user.Name}: account locked");
        }

        var result = hasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);

        if (result == PasswordVerificationResult.Failed)
        {
            if (!SignInLockout.RecordFailure(user, now))
                return await RefuseAsync(user, $"Failed sign-in for user {user.Name}: wrong password");

            await auditLog.LogAsync("SignInLocked", "User", user.Id, SignInLockout.LockedAuditDetails(user));
            return await RefuseAsync(user, $"Failed sign-in for user {user.Name}: wrong password");
        }

        // The password was right, so earlier wrong ones no longer count, even
        // if the role checks below refuse the sign-in.
        if (SignInLockout.Clear(user))
            await context.SaveChangesAsync();

        if (user.Role is UserRole.DemoAdmin or UserRole.DemoFrontDesk)
            return await RefuseAsync(user, $"Failed sign-in for user {user.Name}: demo accounts have no password sign-in");

        // Only after the password check, so it does not reveal which usernames exist.
        if (user.Role == UserRole.Pending)
            return await RefuseAsync(user, $"Sign-in refused for user {user.Name}: account awaiting approval", "Account awaiting approval");

        var token = GenerateToken(user, _jwtSettings);

        return LoginResultDto.Success(token, user.Role);
    }

    public async Task<LoginResultDto> DemoLoginAsync(UserRole role)
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
        var user = await context.Users.SingleOrDefaultAsync(u => u.Name.ToLower() == nameKey && u.Role == role);

        if (user == null)
            return LoginResultDto.Fail("Invalid credentials");

        var token = GenerateToken(user, _jwtSettings);

        return LoginResultDto.Success(token, user.Role);
    }

    // Every refused password sign-in is audited. The typed username is kept
    // only when it names an account: people sometimes type a password there.
    // The save also keeps the user's failed-sign-in count.
    private async Task<LoginResultDto> RefuseAsync(UserEntity? user, string details, string error = "Invalid credentials")
    {
        await auditLog.LogAsync("SignInFailed", "User", user?.Id ?? 0, details);
        await context.SaveChangesAsync();
        return LoginResultDto.Fail(error);
    }

    // Static so the startup warm-up can sign a throwaway token the same way.
    internal static string GenerateToken(UserEntity user, JwtSettings jwtSettings)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim(SecurityStampClaims.ClaimType, user.SecurityStamp)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: jwtSettings.Issuer,
            audience: jwtSettings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
