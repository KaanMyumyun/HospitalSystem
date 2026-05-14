using HospitalSystem.Interface;
using Microsoft.EntityFrameworkCore;
using Moq;
 
public abstract class DepartmentTestBase
{
    protected ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
 
        return new ApplicationDbContext(options);
    }
 
    protected ICurrentUserService CreateCurrentUser(bool isAdmin = true)
    {
        var mock = new Mock<ICurrentUserService>();
        mock.Setup(x => x.IsInRole(UserRole.Admin)).Returns(isAdmin);
        return mock.Object;
    }
 
    protected async Task SeedAsync(ApplicationDbContext db, bool isDoctorActive = false)
    {
        var cardiology = new DepartmentEntity { Id = 1, Department = "Cardiology", IsActive = false };
        var emergency = new DepartmentEntity { Id = 2, Department = "Emergency", IsActive = true };
 
        var doctorUser1 = new UserEntity { Id = 1, Name = "Dr Test", PasswordHash = "hashed", Role = UserRole.Doctor };
        var doctorUser2 = new UserEntity { Id = 2, Name = "Dr Test2", PasswordHash = "hashed", Role = UserRole.Doctor };
 
        var doctor1 = new DoctorEntity { Id = 1, UserId = doctorUser1.Id, User = doctorUser1, DepartmentId = cardiology.Id, Department = cardiology, IsActive = isDoctorActive };
        var doctor2 = new DoctorEntity { Id = 2, UserId = doctorUser2.Id, User = doctorUser2, DepartmentId = emergency.Id, Department = emergency, IsActive = isDoctorActive };
 
        db.Departments.AddRange(cardiology, emergency);
        db.Users.AddRange(doctorUser1, doctorUser2);
        db.Doctors.AddRange(doctor1, doctor2);
 
        await db.SaveChangesAsync();
    }
}
