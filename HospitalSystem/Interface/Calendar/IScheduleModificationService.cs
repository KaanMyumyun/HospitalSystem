namespace HospitalSystem.Interface.Calendar;

public interface IScheduleModificationService
{
        Task<CalendarActionResult> ChangeScheduleAsync(ChangeScheduleDto dto);
}