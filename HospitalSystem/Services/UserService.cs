
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

public class UserService : IUserService
{
    private readonly ApplicationDbContext _context;
    private readonly PasswordHasher<UserEntity> _hasher;
    public UserService(ApplicationDbContext context)
    {
        _context = context;
        _hasher = new PasswordHasher<UserEntity>();
    }

    public async Task<ChangeRoleResultDto> ChangeRoleAsync(ChangeRoleDto dto)
    {
        if (!Enum.IsDefined(typeof(UserRole), dto.NewRole))
        {
           return ChangeRoleResultDto.Fail("Role doesnt exits");
        }
        var user = await _context.Users.FindAsync(dto.UserId);
        if (user == null)
        {
             return ChangeRoleResultDto.Fail("user not found");
        }

        if (user.Role == dto.NewRole)
        {
            return ChangeRoleResultDto.Fail("User already has this role");
        }
        if (dto.NewRole == UserRole.Pending)
        {
            return ChangeRoleResultDto.Fail("Cannot assign Pending role.");
        }

        user.Role = dto.NewRole;
        await _context.SaveChangesAsync();
        return ChangeRoleResultDto.Success();
    }

    public async Task<List<UserDisplayDto>>ListUsersAsync()
    {
        return await _context.Users.Select(u => new UserDisplayDto
        {
          UserId = u.Id,
          UserName = u.Name,
          Role = u.Role  
        }).ToListAsync();
    }

    public async Task<ResetPasswordResultDto> ResetPasswordAsync(ResetPasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.NewPassword))
        {
             return ResetPasswordResultDto.Fail("No password entered");
        }

        var user = await _context.Users.FindAsync(dto.UserId);
        if (user == null)
        {
            return ResetPasswordResultDto.Fail("user not found");
        }
        user.PasswordHash = _hasher.HashPassword(user,dto.NewPassword);
        await _context.SaveChangesAsync();
        return ResetPasswordResultDto.Success();
    }

    
}