namespace HospitalSystem.Interface.Calendar;

public interface IScheduleCreationService
{
    Task<CalendarActionResult> CreateScheduleAsync(CreateSchedule dto);
}