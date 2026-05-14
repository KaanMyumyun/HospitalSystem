namespace HospitalSystem.Interfaces.Appointments;
 
public interface IAppointmentCreationService
{
    Task<CreateAppointmentResultDto> CreateAppointmentAsync(CreateAppointmentDto dto, int frontDeskUserId);
}
