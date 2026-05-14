using HospitalSystem.Interface;
using Microsoft.EntityFrameworkCore;
using Moq;
 
public abstract class UserTestBase
{
    protected ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
 
        return new ApplicationDbContext(options);
    }
 
    protected ICurrentUserService CreateCurrentUser(bool isAdmin = true, bool isFrontDesk = false)
    {
        var mock = new Mock<ICurrentUserService>();
        mock.Setup(x => x.IsInRole(UserRole.Admin)).Returns(isAdmin);
        mock.Setup(x => x.IsInRole(UserRole.FrontDesk)).Returns(isFrontDesk);
        return mock.Object;
    }
 
    protected async Task SeedDoctorAsync(ApplicationDbContext db, bool isDoctorActive = false, UserRole userRole = UserRole.Doctor)
    {
        var department = new DepartmentEntity { Id = 1, Department = "Cardiology" };
        var user = new UserEntity { Id = 1, Name = "Dr Test", PasswordHash = "hashed", Role = userRole };
        var doctor = new DoctorEntity { Id = 1, UserId = 1, User = user, DepartmentId = 1, Department = department, IsActive = isDoctorActive };
 
        db.Departments.Add(department);
        db.Users.Add(user);
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();
    }
}
