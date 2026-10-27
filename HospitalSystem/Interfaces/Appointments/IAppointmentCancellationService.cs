namespace HospitalSystem.Interfaces.Appointments;

public interface IAppointmentCancellationService
{
    Task<CancelAppointmentResultDto> CancelAppointmentAsync(
        CancelAppointmentDto dto, CancellationToken cancellationToken = default);
}
