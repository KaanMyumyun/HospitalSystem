using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Auth;
using System.Text.RegularExpressions;

namespace HospitalSystem.Services.Auth;

public class UserCreationService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog,
    IPasswordHasher<UserEntity> hasher) : IUserCreationService
{
    private static readonly Regex ValidUsername = new(@"^[A-Za-z][A-Za-z0-9_.-]{2,39}$", RegexOptions.Compiled);

    public async Task<CreateUserResultDto> CreateUserAsync(CreateUserDto dto)
    {
        if (currentUser.RequireAdmin<CreateUserResultDto>("create a user") is { } refusal)
            return refusal;

        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Password))
            return CreateUserResultDto.Fail("Name and password are required");

        var name = dto.Name.Trim();
        if (!ValidUsername.IsMatch(name))
            return CreateUserResultDto.Fail("Username must start with a letter and use only letters, numbers, dots, hyphens, or underscores");

        if (dto.Password.Length < 8)
            return CreateUserResultDto.Fail("Password must be at least 8 characters long");

        // Usernames ignore case, so "Admin" and "admin" cannot both exist.
        var nameKey = name.ToLowerInvariant();
        var exists = await context.Users.AnyAsync(u => u.Name.ToLower() == nameKey);
        if (exists)
            return CreateUserResultDto.Conflict("Name already exists");

        var user = new UserEntity
        {
            Name = name,
            Role = UserRole.Pending
        };

        user.PasswordHash = hasher.HashPassword(user, dto.Password);

        await using var transaction = await context.Database.BeginTransactionAsync();

        context.Users.Add(user);
        await context.SaveChangesAsync();

        await auditLog.LogAsync("CreateUser", "User", user.Id, $"Created user {user.Name}");
        await context.SaveChangesAsync();
        await transaction.CommitAsync();

        return CreateUserResultDto.Success();
    }
}
