using Microsoft.EntityFrameworkCore;
using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.User;
using HospitalSystem.Services.Appointments;
using HospitalSystem.Services.Auth;

namespace HospitalSystem.Services.User;

public class DoctorStatusService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog,
    SecurityStampCache stamps) : IDoctorStatusService
{
    public async Task<ChangeDoctorsStatusResult> ChangeDoctorsStatusAsync(ChangeDoctorStatusDto dto)
    {
        if (currentUser.RequireAdmin<ChangeDoctorsStatusResult>("change a doctor's status") is { } refusal)
            return refusal;

        if (dto.IsActive is not bool isActive)
            return ChangeDoctorsStatusResult.Fail("Doctor status is required");

        var doctor = await context.Doctors
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == dto.DoctorId);

        if (doctor == null)
            return ChangeDoctorsStatusResult.NotFound("Doctor not found");

        if (doctor.IsActive == isActive)
            return ChangeDoctorsStatusResult.Fail("Doctor already has this status");

        if (isActive && doctor.User.Role != UserRole.Doctor)
            return ChangeDoctorsStatusResult.Fail("Only users with the Doctor role can be activated");

        if (!isActive)
        {
            var stranded = await AffectedBookings.LoadFutureAsync(context, a => a.DoctorId == doctor.Id);
            var bookingRefusal = await AffectedBookings.ResolveAsync<ChangeDoctorsStatusResult>(
                stranded, dto, auditLog, $"doctor {doctor.User.Name} deactivated");
            if (bookingRefusal is not null)
                return bookingRefusal;
        }

        doctor.IsActive = isActive;
        if (!isActive)
            doctor.User.SecurityStamp = Guid.NewGuid().ToString();
        await auditLog.LogAsync(
            "ChangeDoctorStatus",
            "Doctor",
            doctor.Id,
            $"Doctor {doctor.User.Name} set to {(isActive ? "active" : "inactive")}");
        await context.SaveChangesAsync();
        if (!isActive)
            stamps.Forget(doctor.UserId);

        return ChangeDoctorsStatusResult.Success(new ChangeDoctorsStatus
        {
            DoctorId = doctor.Id,
            UserId = doctor.UserId,
            UserName = doctor.User.Name,
            IsActive = doctor.IsActive
        });
    }
}
