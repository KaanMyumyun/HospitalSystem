namespace HospitalSystem.Interfaces.Calendar;

public interface IScheduleCreationService
{
    Task<CalendarActionResult> CreateScheduleAsync(CreateSchedule dto);
}