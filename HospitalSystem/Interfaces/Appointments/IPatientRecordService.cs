namespace HospitalSystem.Interfaces.Appointments;

public interface IPatientRecordService
{
    Task<ServiceResult<PagedResult<PatientSummaryDto>>> ListPatientsAsync(
        PatientQueryDto query, CancellationToken cancellationToken = default);
    Task<ServiceResult<PatientDetailsDto>> GetPatientAsync(int patientId, CancellationToken cancellationToken = default);
    Task<PatientActionResultDto> UpdatePatientAsync(UpdatePatientDto dto, CancellationToken cancellationToken = default);
}
