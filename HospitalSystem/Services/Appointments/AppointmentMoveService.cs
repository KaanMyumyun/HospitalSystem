using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Appointments;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HospitalSystem.Services.Appointments;

// Moves a booking to another time, or another doctor, in one step: the new
// slot is checked and taken and the old one freed in a single save, so nobody
// can take the new slot in between. The appointment keeps its id and history.
public class AppointmentMoveService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog,
    TimeProvider clock,
    ClinicClock clinic) : IAppointmentMoveService
{
    public async Task<MoveAppointmentResultDto> MoveAsync(MoveAppointmentDto dto, CancellationToken cancellationToken = default)
    {
        if (!currentUser.IsDesk())
            return MoveAppointmentResultDto.Forbidden("You are not allowed to move appointments");

        if (dto.AppointmentTime is not DateTimeOffset requestedTime)
            return MoveAppointmentResultDto.Fail("Appointment time is required");

        var now = clock.GetUtcNow();
        if (requestedTime <= now)
            return MoveAppointmentResultDto.Fail("Appointments cannot be booked in the past");

        var appointment = await context.Appointments.SingleOrDefaultAsync(a => a.Id == dto.AppointmentId, cancellationToken);
        if (appointment == null)
            return MoveAppointmentResultDto.NotFound("Appointment not found");

        if (appointment.Status != AppointmentStatus.Scheduled)
            return MoveAppointmentResultDto.Fail("Only scheduled appointments can be moved");

        if (appointment.TimeOfAppointment <= now.UtcDateTime)
            return MoveAppointmentResultDto.Fail("Past appointments cannot be moved");

        var appointmentTime = requestedTime.UtcDateTime;
        var fromDoctorId = appointment.DoctorId;
        var toDoctorId = dto.DoctorId ?? fromDoctorId;
        if (toDoctorId == fromDoctorId && appointmentTime == appointment.TimeOfAppointment)
            return MoveAppointmentResultDto.Fail("The appointment is already at that time");

        // Working days and hours, breaks and time off are clinic times.
        var wallClock = clinic.WallClock(requestedTime);
        var requestedDay = DateOnly.FromDateTime(wallClock);

        // What the checks need, in one round trip, as for a booking.
        var doctor = await (
            from d in context.Doctors
            where d.Id == toDoctorId
            from c in d.Calendars.DefaultIfEmpty()
            select new
            {
                d.IsActive,
                d.User.Role,
                d.User.Name,
                DepartmentIsActive = d.Department.IsActive,
                Schedule = c == null
                    ? null
                    : new BookingRules.WorkingHours(
                        c.StartTime, c.EndTime, c.SlotDurationMin, c.WorkingDays, c.BreakStartMinute, c.BreakEndMinute),
                IsAway = c != null && c.TimeOff.Any(t => t.FirstDay <= requestedDay && t.LastDay >= requestedDay),
                // The nearest other bookings on either side; this one is
                // moving out of the way, so it does not count.
                PreviousStart = d.Appointments
                    .Where(a => a.Status == AppointmentStatus.Scheduled && a.Id != dto.AppointmentId && a.TimeOfAppointment <= appointmentTime)
                    .Max(a => (DateTime?)a.TimeOfAppointment),
                NextStart = d.Appointments
                    .Where(a => a.Status == AppointmentStatus.Scheduled && a.Id != dto.AppointmentId && a.TimeOfAppointment > appointmentTime)
                    .Min(a => (DateTime?)a.TimeOfAppointment),
                FromDoctorName = context.Doctors.Where(o => o.Id == fromDoctorId).Select(o => o.User.Name).FirstOrDefault()
            })
            .FirstOrDefaultAsync(cancellationToken);
        if (doctor == null)
            return MoveAppointmentResultDto.NotFound("Doctor not found");

        if (!doctor.IsActive || doctor.Role != UserRole.Doctor)
            return MoveAppointmentResultDto.Fail("Doctor is not available for booking");

        if (!doctor.DepartmentIsActive)
            return MoveAppointmentResultDto.Fail("Doctor's department is not active");

        if (doctor.Schedule is not { } schedule)
            return MoveAppointmentResultDto.Fail("Doctor has no schedule");

        if (doctor.IsAway)
            return MoveAppointmentResultDto.Fail($"The doctor is away on {requestedDay:yyyy-MM-dd}");

        if (BookingRules.CheckWorkingHours(schedule, wallClock) is { } scheduleError)
            return MoveAppointmentResultDto.Fail(scheduleError);

        if (BookingRules.Overlaps(appointmentTime, schedule.SlotDurationMin, doctor.PreviousStart, doctor.NextStart))
            return MoveAppointmentResultDto.Conflict("Doctor already booked for that time slot");

        var fromTime = clinic.WallClock(appointment.TimeOfAppointment);
        appointment.DoctorId = toDoctorId;
        appointment.TimeOfAppointment = appointmentTime;
        var newDoctor = toDoctorId == fromDoctorId ? "" : $", from {doctor.FromDoctorName} to {doctor.Name}";
        await auditLog.LogAsync(
            "MoveAppointment",
            "Appointment",
            appointment.Id,
            $"Moved appointment {appointment.Id} from {fromTime:yyyy-MM-dd HH:mm} to {wallClock:yyyy-MM-dd HH:mm}{newDoctor}",
            cancellationToken);

        // The check above is the fast path; the unique index on doctor and
        // time refuses a booking made for the same slot meanwhile.
        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return MoveAppointmentResultDto.Conflict("Doctor already booked for that time slot");
        }

        return MoveAppointmentResultDto.Success();
    }
}
