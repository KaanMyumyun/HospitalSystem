using System;
using System.Threading.Tasks;
using HospitalSystem.Interface;
using HospitalSystem.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

public class AppointmentServiceTest
{
    private ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private AppointmentService CreateService(ApplicationDbContext db, bool isFrontDesk = true)
    {
        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.IsInRole(UserRole.FrontDesk)).Returns(isFrontDesk);
        return new AppointmentService(db, currentUserMock.Object);
    }

 
   private async Task SeedStandardDataAsync(ApplicationDbContext db, bool isDoctorActive = true)
{
    var department = new DepartmentEntity { Id = 1, Department = "Cardiology" };
    
    var userDoctor = new UserEntity { Id = 1, Name = "Dr. Test", PasswordHash = "dummy_hash", Role = UserRole.Doctor };
    var userFrontDesk = new UserEntity { Id = 5, Name = "Front Desk Admin", PasswordHash = "dummy_hash", Role = UserRole.FrontDesk };

    var doctor = new DoctorEntity { Id = 1, UserId = 1, User = userDoctor, DepartmentId = 1, Department = department, IsActive = isDoctorActive };

   var patient1 = new PatientEntity { Id = 1, Name = "Patient One", PhoneNumber = "555-0001", DateOfBirth = DateTime.UtcNow.AddYears(-30) };
    var patient2 = new PatientEntity { Id = 2, Name = "Patient Two", PhoneNumber = "555-0002", DateOfBirth = DateTime.UtcNow.AddYears(-25) };
    var patient3 = new PatientEntity { Id = 3, Name = "Patient Three", PhoneNumber = "555-0003", DateOfBirth = DateTime.UtcNow.AddYears(-40) };
    
    var appointmentTime = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);

   var appointment1 = new AppointmentsEntity { Id = 1, Status = AppointmentStatus.Scheduled, DoctorId = 1, PatientId = 1, TimeOfAppointment = appointmentTime, CreatedAt = appointmentTime, CreatedByTheFrontDeskId = 5 };
    var appointment2 = new AppointmentsEntity { Id = 2, Status = AppointmentStatus.Completed, DoctorId = 1, PatientId = 2, TimeOfAppointment = appointmentTime, CreatedAt = appointmentTime, CreatedByTheFrontDeskId = 5 };
    var appointment3 = new AppointmentsEntity { Id = 3, Status = AppointmentStatus.Cancelled, DoctorId = 1, PatientId = 3, TimeOfAppointment = appointmentTime, CreatedAt = appointmentTime, CreatedByTheFrontDeskId = 5 };

    db.Departments.Add(department);
    db.Users.AddRange(userDoctor, userFrontDesk);
    db.Doctors.Add(doctor);
    db.Patients.AddRange(patient1, patient2, patient3);
    db.Appointments.AddRange(appointment1, appointment2, appointment3);

    await db.SaveChangesAsync();
}

    [Fact]
    public async Task GetAppointmentsAsync_FrontDesk_Succeeds()
    {
        // Arrange
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db, isFrontDesk: true);
        var expectedTime = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);

        // Act
        var result = await service.GetAppointmentsAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Data.Count);

        Assert.Contains(result.Data, u =>
            u.AppointmentId == 1 &&
            u.Status == AppointmentStatus.Scheduled &&
            u.DoctorName == "Dr. Test" &&
            u.PatientName == "Patient One" &&
            u.AppointmentTime == expectedTime);

        Assert.Contains(result.Data, u =>
            u.AppointmentId == 2 &&
            u.Status == AppointmentStatus.Completed &&
            u.PatientName == "Patient Two");

        Assert.Contains(result.Data, u =>
        u.AppointmentId == 3 &&
        u.Status == AppointmentStatus.Cancelled &&
        u.PatientName == "Patient Three");    
    }

    [Fact]
    public async Task GetAppointmentsAsync_NotAdmin_Fails()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateService(db, isFrontDesk: false);

        // Act
        var result = await service.GetAppointmentsAsync();

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("Not allowed to list deparments", result.Error); // Note: Kept your original spelling to ensure the test passes
    }

    [Fact]
    public async Task CancelAppointmentAsync_FrontDesk_Succeeds()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db, isFrontDesk: true);

        var dto = new CancelAppointmentDto
        {
            AppointmentId = 1,
            Status = AppointmentStatus.Cancelled,
            Reason = "Patient requested cancellation"
        };

        // Act
        var result = await service.CancelAppointmentAsync(dto);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.True(db.Doctors.First().IsActive);

        var updatedAppointment = await db.Appointments.FindAsync(1);
        Assert.NotNull(updatedAppointment);
        Assert.Equal(AppointmentStatus.Cancelled, updatedAppointment.Status);
    }

    [Fact]
    public async Task CancelAppointmentAsync_NotFrontDesk_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db, isFrontDesk: false);

        var dto = new CancelAppointmentDto
        {
            AppointmentId = 1,
            Status = AppointmentStatus.Cancelled,
            Reason = "Should fail due to auth"
        };
        var result = await service.CancelAppointmentAsync(dto);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task CancelAppointmentAsync_SameStatus_Fails()
    {
        var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db, isFrontDesk: true);

        var dto = new CancelAppointmentDto
        {
            AppointmentId = 3,
            Status = AppointmentStatus.Cancelled,
            Reason = "Patient requested cancellation"
        };

        // Act
        var result = await service.CancelAppointmentAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Appointment already canceled", result.Error);
    }

    [Fact]
    public async Task CancelAppointmentAsync_Reason_Required()
    {
        var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db, isFrontDesk: true);

        var dto = new CancelAppointmentDto
        {
            AppointmentId = 1,
            Status = AppointmentStatus.Cancelled,
            Reason = ""
        };

        // Act
        var result = await service.CancelAppointmentAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Cancellation reason is required", result.Error);
    }

    [Fact]
    public async Task CancelAppointmentAsync_Not_Found()
    {
        var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db, isFrontDesk: true);

        var dto = new CancelAppointmentDto
        {
            AppointmentId = 134,
            Status = AppointmentStatus.Cancelled,
            Reason = "gg"
        };
        var result = await service.CancelAppointmentAsync(dto);

        Assert.False(result.IsSuccess);
        Assert.Equal("Appointment not found", result.Error);
    }

    [Fact]
    public async Task CancelAppointmentAsync_All_HappyPath()
    {
        var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db, isFrontDesk: true);

        var dto = new CancelAppointmentDto
        {
            AppointmentId = 1,
            Status = AppointmentStatus.Cancelled,
            Reason = "gg"
        };
        var result = await service.CancelAppointmentAsync(dto);

        Assert.True(result.IsSuccess);

        var updatedAppointment = await db.Appointments.FindAsync(1);
        Assert.NotNull(updatedAppointment);
        Assert.Equal("gg", updatedAppointment.CancellationReason);
        Assert.Equal(AppointmentStatus.Cancelled, updatedAppointment.Status);

        Assert.NotNull(updatedAppointment.CancelledAt);
        Assert.True(updatedAppointment.CreatedAt <= DateTime.UtcNow);
    }

    [Fact]
    public async Task CreateAppointmentAsync_FrontDesk_Succeeds()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db, isFrontDesk: true);
     var newAppointmentTime = new DateTime(2026, 1, 1, 10, 30, 0, DateTimeKind.Utc);
    var dateOfBirth = new DateTime(1990, 5, 15, 0, 0, 0, DateTimeKind.Utc);
       var dto = new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "Ball",
            PhoneNumber = "235235",
            DateOfBirth = dateOfBirth,
            AppointmentTime = newAppointmentTime
        };

        // Act
        var result = await service.CreateAppointmentAsync(dto, 5);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.True(db.Doctors.First().IsActive);

     var createdAppointment = await db.Appointments
        .Include(a => a.Patient)
        .FirstOrDefaultAsync(a => a.TimeOfAppointment == newAppointmentTime && a.DoctorId == 1);
        
    Assert.NotNull(createdAppointment);
    Assert.Equal(AppointmentStatus.Scheduled, createdAppointment.Status);
    Assert.Equal(5, createdAppointment.CreatedByTheFrontDeskId); 
    Assert.Equal("Ball", createdAppointment.Patient.Name); 
     }

    [Fact]
    public async Task CreateAppointmentAsync_NotFrontDesk_Fails()
    {
        using var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db, isFrontDesk: false);
        var expectedTime = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);


        var dto = new CreateAppointmentDto
        {
            DoctorId = 1,
            PatientName = "Ball",
            PhoneNumber = "235235",
            DateOfBirth = expectedTime,
            AppointmentTime = expectedTime
        };
        var result = await service.CreateAppointmentAsync(dto, 5);

        Assert.False(result.IsSuccess);
    }

     [Fact]
    public async Task CreateAppointmentAsync_Doctor_DoesntExist()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isFrontDesk: true);
        var expectedTime = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);


        var result = await service.CreateAppointmentAsync(new CreateAppointmentDto {  DoctorId=1000 , PatientName = "gg",PhoneNumber="134",DateOfBirth= expectedTime,AppointmentTime = expectedTime},5);

        Assert.False(result.IsSuccess);
    }
       [Fact]
    public async Task CreateAppointmentAsync_Appointment_OverLap()
    {
       var db = CreateDbContext();
    await SeedStandardDataAsync(db);
    var service = CreateService(db, isFrontDesk: true);
    
    var overlappingTime = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);

    var newAppointment = new CreateAppointmentDto 
    {  
        DoctorId = 1, 
        PatientName = "New Patient",
        PhoneNumber = "123-4567",
        DateOfBirth = DateTime.UtcNow.AddYears(-20), 
        AppointmentTime = overlappingTime 
    };

    // Act
    var result = await service.CreateAppointmentAsync(newAppointment, 5); // 5 matches the seeded FrontDesk User

    // Assert
    Assert.False(result.IsSuccess);
    
    Assert.Equal("Doctor already booked for that time slot", result.Error);
    }

    [Fact]
    public async Task CreateAppointmentAsync_All_HappyPath()
    {
        var db = CreateDbContext();
        await SeedStandardDataAsync(db);
        var service = CreateService(db, isFrontDesk: true);
 var time = new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc);
var dateOfbirth = new DateTime(2000, 1, 2, 10, 0, 0, DateTimeKind.Utc);

        var dto = new CreateAppointmentDto
        {
        DoctorId = 1, 
        PatientName = "New Patient",
        PhoneNumber = "123-4567",
        DateOfBirth = dateOfbirth, 
        AppointmentTime = time 
        };
        var result = await service.CreateAppointmentAsync(dto,5);

    Assert.True(result.IsSuccess);

    var newPatient = await db.Patients.FirstOrDefaultAsync(p => p.Name == "New Patient" && p.PhoneNumber == "123-4567");
    Assert.NotNull(newPatient);
    Assert.Equal("New Patient", newPatient.Name);
    Assert.Equal("123-4567", newPatient.PhoneNumber);
    Assert.Equal(dateOfbirth, newPatient.DateOfBirth);

   var newAppointment = await db.Appointments.FirstOrDefaultAsync(a => a.PatientId == newPatient.Id);
    Assert.NotNull(newAppointment);
    Assert.Equal(time, newAppointment.TimeOfAppointment);

    Assert.Null(newAppointment.CancelledAt); 
    Assert.True(newAppointment.CreatedAt <= DateTime.UtcNow);
    }
}