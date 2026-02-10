namespace HospitalSystem.Services;

using HospitalSystem.Interface;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;


public class UserService : IUserService
{
    private readonly ApplicationDbContext _context;
    private readonly PasswordHasher<UserEntity> _hasher;
    private readonly ICurrentUserService _currentUser;
    public UserService(ApplicationDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _hasher = new PasswordHasher<UserEntity>();
        _currentUser = currentUser;
    }

    public async Task<ChangeDoctorsStatusResult> ChangeDoctorsStatusAsync(ChangeDoctorsStatus dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
        {
            return ChangeDoctorsStatusResult.Fail("You are not allowed to change doctor status");
        }
        var doctor = await _context.Doctors.Include(u => u.User).FirstOrDefaultAsync(u => u.Id == dto.DoctorId);
        if (doctor == null)
        {
            return ChangeDoctorsStatusResult.Fail("Doctor doesnt exist");
        }

        if (doctor.IsActive == dto.IsActive)
        {
            return ChangeDoctorsStatusResult.Fail("Doctor already has this status");
        }

        doctor.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        return ChangeDoctorsStatusResult.Success(new ChangeDoctorsStatus
        {
            DoctorId = doctor.Id,
            UserId = doctor.UserId,
            UserName = doctor.User.Name,
            IsActive = doctor.IsActive
        });
    }

    public async Task<ChangeRoleResultDto> ChangeRoleAsync(ChangeRoleDto dto)
    {
        if (!_currentUser.IsInRole(UserRole.Admin))
        {
            return ChangeRoleResultDto.Fail("You are not allowed to change user role");
        }

        if (!Enum.IsDefined(typeof(UserRole), dto.NewRole))
            return ChangeRoleResultDto.Fail("Role does not exist");

        var user = await _context.Users.FindAsync(dto.UserId);

        if (user == null)
            return ChangeRoleResultDto.Fail("User not found");

        if (user.Role == dto.NewRole)
            return ChangeRoleResultDto.Fail("User already has this role");

        if (dto.NewRole == UserRole.Pending)
            return ChangeRoleResultDto.Fail("Cannot assign Pending role");

        user.Role = dto.NewRole;

        await _context.SaveChangesAsync();
        return ChangeRoleResultDto.Success();
    }


    public async Task<CreateDoctorResultDto> CreateDoctorAsync(CreateDoctorDto dto)
    {
        
         if (!_currentUser.IsInRole(UserRole.Admin))
        {
            return CreateDoctorResultDto.Fail("You are not allowed to create a doctor ");
        }
    
        if (!Enum.IsDefined(typeof(UserRole), dto.NewRole))
            return CreateDoctorResultDto.Fail("Role does not exist");

        var user = await _context.Users.FindAsync(dto.UserId);
   
        if (user == null)
            return CreateDoctorResultDto.Fail("User not found");

            if (user.Role == dto.NewRole)
            return CreateDoctorResultDto.Fail("User already has this role");

        if (dto.NewRole == UserRole.Pending)
            return CreateDoctorResultDto.Fail("Cannot assign Pending role");

        var deparment = await _context.Departments.FindAsync(dto.DeparmentId);

        if (deparment == null)
            return CreateDoctorResultDto.Fail("Deparment not found");

        user.Role = dto.NewRole;

        await _context.Doctors.AddAsync(new DoctorEntity
        {
            DepartmentId = dto.DeparmentId,
            UserId = dto.UserId,
            IsActive = true,
        });


        await _context.SaveChangesAsync();
        return CreateDoctorResultDto.Success();
    }


   public async Task<ServiceResult<List<DoctorDisplayDto>>> ListDoctorsAsync()
{
    if (!_currentUser.IsInRole(UserRole.Admin))
    {
        return ServiceResult<List<DoctorDisplayDto>>
            .Fail("You are not allowed to list doctors");
    }

    var doctors = await _context.Doctors
        .Select(u => new DoctorDisplayDto
        {
            DoctorId = u.Id,
            DeparmentId = u.DepartmentId,
            Name = u.User != null ? u.User.Name : null,
            UserId = u.UserId,
            IsActive = u.IsActive
        })
        .ToListAsync();

    return ServiceResult<List<DoctorDisplayDto>>.Success(doctors);
}


    public async Task<ServiceResult<List<UserDisplayDto>>> ListUsersAsync()
{
    if (!_currentUser.IsInRole(UserRole.Admin))
    {
        return ServiceResult<List<UserDisplayDto>>
            .Fail("Not allowed to list users");
    }

    var users = await _context.Users
        .Select(u => new UserDisplayDto
        {
            UserId = u.Id,
            UserName = u.Name,
            Role = u.Role
        })
        .ToListAsync();

    return ServiceResult<List<UserDisplayDto>>.Success(users);
}

    public async Task<ResetPasswordResultDto> ResetPasswordAsync(ResetPasswordDto dto)
    {
         if (!_currentUser.IsInRole(UserRole.Admin))
        {
            return ResetPasswordResultDto.Fail("You are not allowed to reset password");
        }
        if (string.IsNullOrWhiteSpace(dto.NewPassword))
        {
            return ResetPasswordResultDto.Fail("No password entered");
        }

        var user = await _context.Users.FindAsync(dto.UserId);
        if (user == null)
        {
            return ResetPasswordResultDto.Fail("user not found");
        }
        user.PasswordHash = _hasher.HashPassword(user, dto.NewPassword);
        await _context.SaveChangesAsync();
        return ResetPasswordResultDto.Success();
    }
}