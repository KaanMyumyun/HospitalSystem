namespace HospitalSystem.Interfaces.Calendar;

public interface IScheduleQueryService
{
    Task<ServiceResult<List<ViewSchedule>>> ViewScheduleAsync();
}