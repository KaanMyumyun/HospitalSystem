namespace HospitalSystem.Interfaces.Calendar;

public interface ITimeOffService
{
    Task<CalendarActionResult> AddTimeOffAsync(AddTimeOffDto dto, CancellationToken cancellationToken = default);
    Task<CalendarActionResult> RemoveTimeOffAsync(int scheduleId, int timeOffId, CancellationToken cancellationToken = default);
}
