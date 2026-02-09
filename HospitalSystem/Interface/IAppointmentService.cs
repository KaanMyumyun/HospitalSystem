namespace HospitalSystem.Interface;

public interface IAppointmentService
{
    Task<CreateAppointmentResultDto> CreateAppointmentAsync(CreateAppointmentDto dto,int frontDeskUserId);
    Task<CancelAppointmentResultDto> CancelAppointmentAsync(CancelAppointmentDto dto);
    Task<ServiceResult<List<ViewAppointmentDto>>>GetAppointmentsAsync( );
}