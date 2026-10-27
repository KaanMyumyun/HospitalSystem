namespace HospitalSystem.Interfaces.Appointments;

public interface IAppointmentStatusService
{
    Task<AppointmentStatusResultDto> ChangeStatusAsync(
        ChangeAppointmentStatusDto dto, CancellationToken cancellationToken = default);
}
