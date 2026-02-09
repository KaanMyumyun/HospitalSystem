
namespace HospitalSystem.Services;

using System.Runtime.CompilerServices;
using HospitalSystem.Interface;
using Microsoft.EntityFrameworkCore;

public class DepartmentService : IDepartmentService
{
    private readonly ApplicationDbContext _context;
  private readonly ICurrentUserService _currentUser;
    public DepartmentService(ApplicationDbContext context,ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }
    public async Task<DepartmentActionResultDto> ChangeDepartmentStatusAsync(ChangeDepartmentStatusDto dto)
    {   
          if (!_currentUser.IsInRole(UserRole.Admin))
        {
            return DepartmentActionResultDto.Fail("You are not allowed to change doctor status");
        }
       
        var department = await _context.Departments.FirstOrDefaultAsync(u => u.Id == dto.DepartmentId );
        if (department==null)
        {
            return DepartmentActionResultDto.Fail("Department doesnt exist");
        }

        department.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        return DepartmentActionResultDto.Success();
    }

    public async Task<DepartmentActionResultDto> ChangeDoctorDepartmentAsync(ChangeDoctorDepartmentDto dto)
    {
          if (!_currentUser.IsInRole(UserRole.Admin))
        {
            return DepartmentActionResultDto.Fail("You are not allowed to change doctor status");
        }

        var Doctor = await _context.Doctors.FirstOrDefaultAsync(u => u.Id == dto.DoctorId );
        if (Doctor==null)
        {
            return DepartmentActionResultDto.Fail("Doctor doesnt exist ");
        }
        if(!Doctor.IsActive)
        {
            return DepartmentActionResultDto.Fail("This Doctor isnt active");
        }

        var Department = await _context.Departments.FirstOrDefaultAsync(u => u.Id == dto.DepartmentId );
        if (Department==null)
        {
            return DepartmentActionResultDto.Fail("Department doesnt exist");
        }
        if(!Department.IsActive)
        {
            return DepartmentActionResultDto.Fail("This Deparment isnt active");
        }

        if(Doctor.DepartmentId == dto.DepartmentId)
        {
            return DepartmentActionResultDto.Fail("Already in that department");
        } 

        Doctor.DepartmentId = dto.DepartmentId;
        await _context.SaveChangesAsync();
        return DepartmentActionResultDto.Success();
    }

    public async Task<DepartmentActionResultDto> CreateDepartmentAsync(CreateDepartmentDto dto)
    {
         if (!_currentUser.IsInRole(UserRole.Admin))
        {
            return DepartmentActionResultDto.Fail("You are not allowed to change doctor status");
        }
        var exist = await _context.Departments.AnyAsync(u => u.Department == dto.Name);

        if (exist)
        {
            return DepartmentActionResultDto.Fail("Department already exists");
        }

        var department = new DepartmentEntity
        {
            Department = dto.Name
        };

        _context.Departments.Add(department);
        await _context.SaveChangesAsync();
        return DepartmentActionResultDto.Success();

    }

    public async Task<List<ViewDepartmentDto>> ListDepartmentsAsync()
    {
        return await _context.Departments.Select(u => new ViewDepartmentDto
        {
            Id = u.Id,
            Name = u.Department,
            IsActive = u.IsActive
        }).ToListAsync();
    }
}