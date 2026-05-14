namespace HospitalSystem.Interface.Calendar;

public interface IScheduleQueryService
{
    Task<ServiceResult<List<ViewSchedule>>> ViewScheduleAsync();
}