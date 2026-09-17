using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Tests;

public class CreateAppointmentDtoTests
{
    private static CreateAppointmentDto ValidDto() => new()
    {
        DoctorId = 1,
        PatientName = "Jane Doe",
        PhoneNumber = "+90 532 123 45 67",
        DateOfBirth = new DateOnly(1990, 5, 20),
        AppointmentTime = new DateTime(2030, 1, 1, 10, 0, 0, DateTimeKind.Utc)
    };

    private static List<ValidationResult> Validate(CreateAppointmentDto dto)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(dto, new ValidationContext(dto), results, validateAllProperties: true);
        return results;
    }

    [Fact]
    public void ValidDto_HasNoErrors()
    {
        Assert.Empty(Validate(ValidDto()));
    }

    [Fact]
    public void PatientNameLongerThanColumn_IsRejected()
    {
        var dto = ValidDto();
        dto.PatientName = new string('a', 51);

        var error = Assert.Single(Validate(dto));
        Assert.Equal("Patient name must be 50 characters or fewer", error.ErrorMessage);
    }

    [Fact]
    public void PhoneNumberLongerThanColumn_IsRejected()
    {
        var dto = ValidDto();
        // 12 digits, so the digit-count rule accepts it, but 23 characters.
        dto.PhoneNumber = "+90 (532) 123 - 45 - 67";

        var error = Assert.Single(Validate(dto));
        Assert.Equal("Phone number must be 20 characters or fewer", error.ErrorMessage);
    }
}
