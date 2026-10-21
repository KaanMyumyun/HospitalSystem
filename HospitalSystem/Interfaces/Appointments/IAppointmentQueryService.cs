namespace HospitalSystem.Interfaces.Appointments;

public interface IAppointmentQueryService
{
    Task<ServiceResult<List<ViewAppointmentDto>>> GetAppointmentsAsync(AppointmentQueryDto query);
    Task<ServiceResult<List<ViewAppointmentDto>>> GetMyAppointmentsAsync(MyAppointmentsQueryDto query);
}
