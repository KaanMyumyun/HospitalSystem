using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interface;
using HospitalSystem.Interface.Auth;
using System.Text.RegularExpressions;

public class UserCreationService : IUserCreationService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly PasswordHasher<UserEntity> _hasher;
    private static readonly Regex ValidUsername = new(@"^[A-Za-z][A-Za-z0-9_.-]{2,39}$", RegexOptions.Compiled);
 
    public UserCreationService(ApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
        _hasher = new PasswordHasher<UserEntity>();
    }
 
    public async Task<CreateUserResultDto> CreateUserAsync(CreateUserDto dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return CreateUserResultDto.Fail("You are not allowed to create a user");
 
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Password))
            return CreateUserResultDto.Fail("Name and password are required");

        var name = dto.Name.Trim();
        if (!ValidUsername.IsMatch(name))
            return CreateUserResultDto.Fail("Username must start with a letter and use only letters, numbers, dots, hyphens, or underscores");

        if (dto.Password.Length < 8)
            return CreateUserResultDto.Fail("Password must be at least 8 characters long");
 
        var exists = await _context.Users.AnyAsync(u => u.Name == name);
        if (exists)
            return CreateUserResultDto.Fail("Name already exists");
 
        var user = new UserEntity
        {
            Name = name,
            Role = UserRole.Pending
        };
 
        user.PasswordHash = _hasher.HashPassword(user, dto.Password);
 
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
 
        return CreateUserResultDto.Success();
    }
}
