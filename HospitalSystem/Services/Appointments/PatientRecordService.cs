using HospitalSystem.Interfaces;
using HospitalSystem.Interfaces.Appointments;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.Appointments;

// The front desk's view of patients: finding one, their appointments, and
// correcting their details, such as a phone number that changed.
public class PatientRecordService(
    ApplicationDbContext context,
    ICurrentUserService currentUser,
    IAuditLogService auditLog) : IPatientRecordService
{
    // A patient's newest appointments, up to this many, come with them.
    private const int MaxAppointments = 200;

    private bool CanRead() =>
        currentUser.IsDesk() || currentUser.IsInRole(UserRole.DemoFrontDesk);

    public async Task<ServiceResult<PagedResult<PatientSummaryDto>>> ListPatientsAsync(PatientQueryDto query)
    {
        if (!CanRead())
            return ServiceResult<PagedResult<PatientSummaryDto>>.Forbidden("Not allowed to list patients");

        if (query.Page < 1 || query.Page > PatientQueryDto.MaxPage)
            return ServiceResult<PagedResult<PatientSummaryDto>>.Fail($"Page must be between 1 and {PatientQueryDto.MaxPage}");

        if (query.PageSize < 1 || query.PageSize > PatientQueryDto.MaxPageSize)
            return ServiceResult<PagedResult<PatientSummaryDto>>.Fail($"Page size must be between 1 and {PatientQueryDto.MaxPageSize}");

        var patients = context.Patients.AsQueryable();
        var search = query.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
        {
            var nameKey = search.ToLowerInvariant();
            // Phone numbers are stored as digits, so the search's digits are
            // compared; fewer than three would match nearly everyone.
            var digits = string.Concat(search.Where(char.IsAsciiDigit));
            patients = digits.Length >= 3
                ? patients.Where(p => p.Name.ToLower().Contains(nameKey) || p.PhoneNumber.Contains(digits))
                : patients.Where(p => p.Name.ToLower().Contains(nameKey));
        }

        var rows = await patients
            .OrderBy(p => p.Name)
            .ThenBy(p => p.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(p => new
            {
                Item = new PatientSummaryDto
                {
                    PatientId = p.Id,
                    Name = p.Name,
                    DateOfBirth = p.DateOfBirth,
                    PhoneNumber = p.PhoneNumber
                },
                // Counted by the same statement, so a page and its total cost
                // one round trip.
                TotalCount = patients.Count()
            })
            .ToListAsync();

        // An empty page carries no total. On page 1 there is nothing to
        // count; a later page is past the last match and needs its own count.
        var totalCount = rows.Count > 0 ? rows[0].TotalCount
            : query.Page == 1 ? 0
            : await patients.CountAsync();

        return ServiceResult<PagedResult<PatientSummaryDto>>.Success(new PagedResult<PatientSummaryDto>
        {
            Items = rows.Select(r => r.Item).ToList(),
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize
        });
    }

    public async Task<ServiceResult<PatientDetailsDto>> GetPatientAsync(int patientId)
    {
        if (!CanRead())
            return ServiceResult<PatientDetailsDto>.Forbidden("Not allowed to view patients");

        var patient = await context.Patients
            .AsNoTracking()
            .Where(p => p.Id == patientId)
            .Select(p => new PatientDetailsDto
            {
                PatientId = p.Id,
                Name = p.Name,
                DateOfBirth = p.DateOfBirth,
                PhoneNumber = p.PhoneNumber,
                Appointments = p.Appointments
                    .OrderByDescending(a => a.TimeOfAppointment)
                    .ThenByDescending(a => a.Id)
                    .Take(MaxAppointments)
                    .Select(a => new PatientAppointmentDto
                    {
                        AppointmentId = a.Id,
                        AppointmentTime = a.TimeOfAppointment,
                        DoctorId = a.DoctorId,
                        DoctorName = a.Doctor.User.Name,
                        Status = a.Status,
                        CancellationReason = a.CancellationReason
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();

        return patient is null
            ? ServiceResult<PatientDetailsDto>.NotFound("Patient not found")
            : ServiceResult<PatientDetailsDto>.Success(patient);
    }

    public async Task<PatientActionResultDto> UpdatePatientAsync(UpdatePatientDto dto)
    {
        if (!currentUser.IsDesk())
            return PatientActionResultDto.Forbidden("You are not allowed to change patient details");

        var name = dto.Name.Trim();
        if (name.Length == 0)
            return PatientActionResultDto.Fail("Patient name is required");

        var phoneError = PatientDetails.PhoneNumberError(dto.PhoneNumber);
        if (phoneError is not null)
            return PatientActionResultDto.Fail(phoneError);

        if (dto.DateOfBirth is not DateOnly dateOfBirth)
            return PatientActionResultDto.Fail("Date of birth is required");

        if (dateOfBirth > DateOnly.FromDateTime(DateTime.UtcNow))
            return PatientActionResultDto.Fail("Date of birth cannot be in the future");

        var patient = await context.Patients.FindAsync(dto.PatientId);
        if (patient is null)
            return PatientActionResultDto.NotFound("Patient not found");

        var phoneNumber = PatientDetails.NormalizePhoneNumber(dto.PhoneNumber);
        var changes = new List<string>();
        if (patient.Name != name)
            changes.Add($"name from {patient.Name} to {name}");
        if (patient.PhoneNumber != phoneNumber)
            changes.Add($"phone number from {patient.PhoneNumber} to {phoneNumber}");
        if (patient.DateOfBirth != dateOfBirth)
            changes.Add($"date of birth from {patient.DateOfBirth:yyyy-MM-dd} to {dateOfBirth:yyyy-MM-dd}");

        if (changes.Count == 0)
            return PatientActionResultDto.Fail("Nothing to change");

        patient.Name = name;
        patient.PhoneNumber = phoneNumber;
        patient.DateOfBirth = dateOfBirth;
        await auditLog.LogAsync("UpdatePatient", "Patient", patient.Id, $"Patient {patient.Id}: changed {string.Join(", ", changes)}");
        await context.SaveChangesAsync();

        return PatientActionResultDto.Success();
    }
}
