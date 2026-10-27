namespace HospitalSystem.Interfaces.Appointments;

public interface IAppointmentMoveService
{
    Task<MoveAppointmentResultDto> MoveAsync(MoveAppointmentDto dto, CancellationToken cancellationToken = default);
}
