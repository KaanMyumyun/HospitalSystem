namespace HospitalSystem.Interfaces.Calendar;

public interface IScheduleModificationService
{
        Task<CalendarActionResult> ChangeScheduleAsync(ChangeScheduleDto dto);
}