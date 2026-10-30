using HospitalSystem.Interfaces;
using Microsoft.EntityFrameworkCore;
using Moq;
using HospitalSystem.Interfaces.Appointments;

namespace HospitalSystem.Tests;



public abstract class AppointmentTestBase
{
    protected static readonly DateTimeOffset Now = new(2025, 12, 1, 9, 0, 0, TimeSpan.Zero);

    protected static FixedClock CreateClock() => new(Now);

    protected ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new ApplicationDbContext(options);
    }

    protected ICurrentUserService CreateCurrentUser(bool isFrontDesk = true, bool isDemoFrontDesk = false, string? userId = "5")
    {
        var mock = new Mock<ICurrentUserService>();
        mock.Setup(x => x.IsInRole(UserRole.FrontDesk)).Returns(isFrontDesk);
        mock.Setup(x => x.IsInRole(UserRole.DemoFrontDesk)).Returns(isDemoFrontDesk);
        mock.Setup(x => x.UserId).Returns(userId);
        return mock.Object;
    }

    protected async Task SeedStandardDataAsync(ApplicationDbContext db, bool isDoctorActive = true)
    {
        var department = new DepartmentEntity { Id = 1, Name = "Cardiology", IsActive = true };

        var userDoctor = new UserEntity { Id = 1, Name = "Dr. Test", PasswordHash = "dummy_hash", Role = UserRole.Doctor };
        var userFrontDesk = new UserEntity { Id = 5, Name = "Front Desk Admin", PasswordHash = "dummy_hash", Role = UserRole.FrontDesk };

        var doctor = new DoctorEntity { Id = 1, UserId = 1, User = userDoctor, DepartmentId = 1, Department = department, IsActive = isDoctorActive };

        var patient1 = new PatientEntity { Id = 1, Name = "Patient One", PhoneNumber = "5550001", DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-30)) };
        var patient2 = new PatientEntity { Id = 2, Name = "Patient Two", PhoneNumber = "5550002", DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-25)) };
        var patient3 = new PatientEntity { Id = 3, Name = "Patient Three", PhoneNumber = "5550003", DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-40)) };

        var appointmentTime = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);

        var appointment1 = new AppointmentEntity { Id = 1, Status = AppointmentStatus.Scheduled, DoctorId = 1, PatientId = 1, TimeOfAppointment = appointmentTime, CreatedAt = appointmentTime, CreatedByTheFrontDeskId = 5 };
        var appointment2 = new AppointmentEntity { Id = 2, Status = AppointmentStatus.Completed, DoctorId = 1, PatientId = 2, TimeOfAppointment = appointmentTime, CreatedAt = appointmentTime, CreatedByTheFrontDeskId = 5 };
        var appointment3 = new AppointmentEntity { Id = 3, Status = AppointmentStatus.Cancelled, DoctorId = 1, PatientId = 3, TimeOfAppointment = appointmentTime, CreatedAt = appointmentTime, CreatedByTheFrontDeskId = 5 };

        db.Departments.Add(department);
        db.Users.AddRange(userDoctor, userFrontDesk);
        db.Doctors.Add(doctor);
        db.Calendars.Add(new CalendarEntity
        {
            Id = 1,
            DoctorId = 1,
            StartTime = new DateTime(2000, 1, 1, 8, 0, 0, DateTimeKind.Utc),
            EndTime = new DateTime(2000, 1, 1, 18, 0, 0, DateTimeKind.Utc),
            SlotDurationMin = 15
        });
        db.Patients.AddRange(patient1, patient2, patient3);
        db.Appointments.AddRange(appointment1, appointment2, appointment3);

        await db.SaveChangesAsync();
    }
}
