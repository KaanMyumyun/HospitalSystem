using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interface;
using HospitalSystem.Interface.Auth;

public class UserCreationService : IUserCreationService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly PasswordHasher<UserEntity> _hasher;
 
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
 
        var exists = await _context.Users.AnyAsync(u => u.Name == dto.Name);
        if (exists)
            return CreateUserResultDto.Fail("Name already exists");
 
        var user = new UserEntity
        {
            Name = dto.Name,
            Role = UserRole.Pending
        };
 
        user.PasswordHash = _hasher.HashPassword(user, dto.Password);
 
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
 
        return CreateUserResultDto.Success();
    }
}
