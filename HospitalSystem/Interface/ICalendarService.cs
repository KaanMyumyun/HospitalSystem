public interface ICalendarService
{
    Task<CalendarActionResult> CreateScheduleAsync(CreateSchedule dto);
    Task<CalendarActionResult> ChangeScheduleAsync(ChangeScheduleDto dto);
    Task<ServiceResult<List<ViewSchedule>>>ViewScheduleAsync( );
}   