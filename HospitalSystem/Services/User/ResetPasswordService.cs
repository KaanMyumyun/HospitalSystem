using Microsoft.AspNetCore.Identity;
using HospitalSystem.Interface;
using HospitalSystem.Interface.User;
 
namespace HospitalSystem.Services;
 
public class ResetPasswordService : IResetPasswordService
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly PasswordHasher<UserEntity> _hasher;
 
    public ResetPasswordService(ApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
        _hasher = new PasswordHasher<UserEntity>();
    }
 
    public async Task<ResetPasswordResultDto> ResetPasswordAsync(ResetPasswordDto dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
            return ResetPasswordResultDto.Fail("You are not allowed to reset password");
 
        if (string.IsNullOrWhiteSpace(dto.NewPassword))
            return ResetPasswordResultDto.Fail("No password entered");
 
        var user = await _context.Users.FindAsync(dto.UserId);
        if (user == null)
            return ResetPasswordResultDto.Fail("User not found");
 
        user.PasswordHash = _hasher.HashPassword(user, dto.NewPassword);
        await _context.SaveChangesAsync();
 
        return ResetPasswordResultDto.Success();
    }
}
