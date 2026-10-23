using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Department;

namespace HospitalSystem.Services.Department;

public class DepartmentQueryService(ApplicationDbContext context, ICurrentUserService currentUser) : IDepartmentQueryService
{
    public async Task<ServiceResult<List<ViewDepartmentDto>>> ListDepartmentsAsync()
    {
        if (!currentUser.CanReadReferenceData())
            return ServiceResult<List<ViewDepartmentDto>>.Forbidden("Not allowed to list departments");

        var departments = await context.Departments
            .Select(d => new ViewDepartmentDto
            {
                Id = d.Id,
                Name = d.Department,
                IsActive = d.IsActive
            })
            .ToListAsync();

        return ServiceResult<List<ViewDepartmentDto>>.Success(departments);
    }
}
