namespace HospitalSystem.Interfaces.Appointments;

public interface IPatientRecordService
{
    Task<ServiceResult<PagedResult<PatientSummaryDto>>> ListPatientsAsync(PatientQueryDto query);
    Task<ServiceResult<PatientDetailsDto>> GetPatientAsync(int patientId);
    Task<PatientActionResultDto> UpdatePatientAsync(UpdatePatientDto dto);
}
