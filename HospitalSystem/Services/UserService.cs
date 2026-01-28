
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
        return ChangeRoleResultDto.Fail("Role does not exist");

    var user = await _context.Users
        .Include(u => u.Doctor)
        .SingleOrDefaultAsync(u => u.Id == dto.UserId);

    if (user == null)
        return ChangeRoleResultDto.Fail("User not found");

    if (user.Role == dto.NewRole)
        return ChangeRoleResultDto.Fail("User already has this role");

    if (dto.NewRole == UserRole.Pending)
        return ChangeRoleResultDto.Fail("Cannot assign Pending role");

    user.Role = dto.NewRole;

    if (dto.NewRole == UserRole.Doctor)
    {
        if (user.Doctor == null)
        {
            _context.Doctors.Add(new DoctorEntity
            {
                UserId = user.Id,
                IsActive = true
            });
        }
        else
        {
            user.Doctor.IsActive = true;
        }
    }
    else
    {
        if (user.Doctor != null)
        {
            user.Doctor.IsActive = false;
        }
    }

    await _context.SaveChangesAsync();
    return ChangeRoleResultDto.Success();
}

    public async Task<List<DoctorDisplayDto>> ListDoctorsAsync()
    {
        return await _context.Doctors.Select(u => new DoctorDisplayDto
        {
            DoctorId = u.Id,
            DeparmentId = u.DepartmentId,
            Name = u.User != null && u.User.Doctor != null ? u.User.Name : null,
            UserId = u.UserId
            
        }).ToListAsync();
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