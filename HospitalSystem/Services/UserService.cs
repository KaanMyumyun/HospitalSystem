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
            return ChangeRoleResultDto.Fail("Not allowed");

        var user = await _context.Users.FindAsync(dto.UserId);
        if (user == null)
            return ChangeRoleResultDto.Fail("User not found");

        if (!Enum.IsDefined(typeof(UserRole), dto.NewRole))
            return ChangeRoleResultDto.Fail("Invalid role");

        if (dto.NewRole == UserRole.Pending)
            return ChangeRoleResultDto.Fail("Invalid role");

        if (user.Role == dto.NewRole)
            return ChangeRoleResultDto.Fail("User already has this role");

        user.Role = dto.NewRole;

        var doctor = await _context.Doctors
            .FirstOrDefaultAsync(d => d.UserId == user.Id);

        if (dto.NewRole == UserRole.Doctor)
        {
            if (doctor == null)
            {
                _context.Doctors.Add(new DoctorEntity
                {
                    UserId = user.Id,
                    IsActive = false,
                    DepartmentId = 1
                });
            }
            else
            {
                doctor.IsActive = true; // or false if you want manual activation
            }
        }
        else
        {
            // Role changed AWAY from Doctor
            if (doctor != null)
            {
                doctor.IsActive = false;
            }
        }

        await _context.SaveChangesAsync();
        return ChangeRoleResultDto.Success();
    }



 public async Task<CreateDoctorResultDto> CreateDoctorAsync(CreateDoctorDto dto)
{
    if (!_currentUser.IsInRole(UserRole.Admin))
        return CreateDoctorResultDto.Fail("You are not allowed to create a doctor");

    var user = await _context.Users.FindAsync(dto.UserId);
    if (user == null)
        return CreateDoctorResultDto.Fail("User not found");

    var department = await _context.Departments.FindAsync(dto.DepartmentId);
    if (department == null)
        return CreateDoctorResultDto.Fail("Department not found");
var doctor = await _context.Doctors
    .FirstOrDefaultAsync(d => d.UserId == dto.UserId);

if (doctor == null)
{
    // create
    doctor = new DoctorEntity
    {
        UserId = dto.UserId,
        DepartmentId = dto.DepartmentId,
        IsActive = true
    };
    _context.Doctors.Add(doctor);
}
else
{
    // reactivate / update
    doctor.DepartmentId = dto.DepartmentId;
    doctor.IsActive = true;
}

user.Role = UserRole.Doctor;

await _context.SaveChangesAsync();
return CreateDoctorResultDto.Success();

}


 public async Task<ServiceResult<List<DoctorDisplayDto>>> ListDoctorsAsync()
{   
    if (!_currentUser.IsInRole(UserRole.Admin)&&!_currentUser.IsInRole(UserRole.FrontDesk)&&!_currentUser.IsInRole(UserRole.DemoAdmin)&&!_currentUser.IsInRole(UserRole.DemoFrontDesk))
    {
        return ServiceResult<List<DoctorDisplayDto>>
            .Fail("You are not allowed to list doctors");
    }

    var doctors = await _context.Doctors
        .Include(d => d.User)
        .Where(d => d.User.Role == UserRole.Doctor)
        .Select(d => new DoctorDisplayDto
        {
            DoctorId = d.Id,
            DeparmentId = d.DepartmentId,
            Name = d.User.Name,
            UserId = d.UserId,
            IsActive = d.IsActive
        })
        .ToListAsync();

    return ServiceResult<List<DoctorDisplayDto>>.Success(doctors);
}



    public async Task<ServiceResult<List<UserDisplayDto>>> ListUsersAsync()
{
    // if (_currentUser.IsInRole(UserRole.DemoAdmin) || _currentUser.IsInRole(UserRole.DemoFrontDesk))
    // {
    //     var mockUsers = new List<UserDisplayDto>
    //     {
    //         new UserDisplayDto { UserId = 101, UserName = "Dr. John Smith (Demo)", Role = UserRole.Admin },
    //         new UserDisplayDto { UserId = 102, UserName = "Jane Doe (Demo)", Role = UserRole.FrontDesk },
    //         new UserDisplayDto { UserId = 103, UserName = "Admin Tester", Role = UserRole.Admin },
    //         new UserDisplayDto { UserId = 104, UserName = "New Applicant", Role = UserRole.Pending }
    //     };
        
    //     return ServiceResult<List<UserDisplayDto>>.Success(mockUsers);
    // }
    if (!_currentUser.IsInRole(UserRole.Admin)&&!_currentUser.IsInRole(UserRole.FrontDesk)&&!_currentUser.IsInRole(UserRole.DemoAdmin)&&!_currentUser.IsInRole(UserRole.DemoFrontDesk))
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