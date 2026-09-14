namespace HospitalSystem.Interfaces.Appointments;
 
public interface IAppointmentQueryService
{
    Task<ServiceResult<List<ViewAppointmentDto>>> GetAppointmentsAsync();
}
