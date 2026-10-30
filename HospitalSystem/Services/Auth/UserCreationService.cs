using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Auth;

namespace HospitalSystem.Services.Auth;

public class UserCreationService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog,
    IPasswordHasher<UserEntity> hasher) : IUserCreationService
{
    public async Task<CreateUserResultDto> CreateUserAsync(CreateUserDto dto, CancellationToken cancellationToken = default)
    {
        if (currentUser.RequireAdmin<CreateUserResultDto>("create a user") is { } refusal)
            return refusal;

        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Password))
            return CreateUserResultDto.Fail("Name and password are required");

        var name = dto.Name.Trim();
        if ((AccountRules.UsernameError(name) ?? AccountRules.PasswordError(dto.Password)) is { } error)
            return CreateUserResultDto.Fail(error);

        var nameKey = name.ToLowerInvariant();
        var exists = await context.Users.AnyAsync(u => u.Name.ToLower() == nameKey, cancellationToken);
        if (exists)
            return CreateUserResultDto.Conflict("Name already exists");

        var user = new UserEntity
        {
            Name = name,
            Role = UserRole.Pending
        };

        user.PasswordHash = hasher.HashPassword(user, dto.Password);

        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

        context.Users.Add(user);
        await context.SaveChangesAsync(cancellationToken);

        await auditLog.LogAsync("CreateUser", "User", user.Id, $"Created user {user.Name}", cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return CreateUserResultDto.Success();
    }
}
