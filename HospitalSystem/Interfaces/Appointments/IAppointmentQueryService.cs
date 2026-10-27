namespace HospitalSystem.Interfaces.Appointments;

public interface IAppointmentQueryService
{
    Task<ServiceResult<List<ViewAppointmentDto>>> GetAppointmentsAsync(
        AppointmentQueryDto query, CancellationToken cancellationToken = default);
    Task<ServiceResult<List<ViewAppointmentDto>>> GetMyAppointmentsAsync(
        MyAppointmentsQueryDto query, CancellationToken cancellationToken = default);
}
