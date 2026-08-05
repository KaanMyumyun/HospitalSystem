using Xunit;
using HospitalSystem.Services;
 
public class DoctorStatusServiceTests : UserTestBase
{
    private DoctorStatusService CreateService(ApplicationDbContext db, bool isAdmin = true)
        => new(db, CreateCurrentUser(isAdmin), new TestAuditLogService(db));
 
    [Fact]
    public async Task ChangeDoctorsStatusAsync_Admin_Succeeds()
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db, isDoctorActive: false);
        var service = CreateService(db);
 
        var result = await service.ChangeDoctorsStatusAsync(new ChangeDoctorsStatus { DoctorId = 1, IsActive = true });
 
        Assert.True(result.IsSuccess);
        Assert.True(db.Doctors.First().IsActive);
    }
 
    [Fact]
    public async Task ChangeDoctorsStatusAsync_NotAdmin_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db, isAdmin: false);
 
        var result = await service.ChangeDoctorsStatusAsync(new ChangeDoctorsStatus { DoctorId = 1, IsActive = true });
 
        Assert.False(result.IsSuccess);
    }
 
    [Fact]
    public async Task ChangeDoctorsStatusAsync_DoctorNotFound_Fails()
    {
        var db = CreateDbContext();
        var service = CreateService(db);
 
        var result = await service.ChangeDoctorsStatusAsync(new ChangeDoctorsStatus { DoctorId = 999, IsActive = true });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Doctor doesnt exist", result.Error);
    }
 
    [Fact]
    public async Task ChangeDoctorsStatusAsync_SameStatus_Fails()
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db, isDoctorActive: true);
        var service = CreateService(db);
 
        var result = await service.ChangeDoctorsStatusAsync(new ChangeDoctorsStatus { DoctorId = 1, IsActive = true });
 
        Assert.False(result.IsSuccess);
        Assert.Equal("Doctor already has this status", result.Error);
    }
 
    [Fact]
    public async Task ChangeDoctorsStatusAsync_Deactivate_Succeeds()
    {
        var db = CreateDbContext();
        await SeedDoctorAsync(db, isDoctorActive: true);
        var service = CreateService(db);
 
        var result = await service.ChangeDoctorsStatusAsync(new ChangeDoctorsStatus { DoctorId = 1, IsActive = false });
 
        Assert.True(result.IsSuccess);
        Assert.False(db.Doctors.First().IsActive);
    }
}
