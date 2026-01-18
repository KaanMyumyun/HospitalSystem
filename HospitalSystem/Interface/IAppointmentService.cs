public interface IAppointmentService
{
    Task<CreateAppointmentResultDto> CreateAppointmentAsync(CreateAppointmentDto dto,int frontDeskUserId);
    Task<CancelAppointmentResultDto> CancelAppointmentAsync(CancelAppointmentDto dto);
    Task<List<ViewAppointmentDto>>GetAppointmentsAsync( );
}