using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Dto;

public class CreateDepartmentDto
{
    // The limit matches the Departments column.
    [Required]
    [MinLength(3)]
    [MaxLength(100, ErrorMessage = "Department name must be 100 characters or fewer")]
    public string Name { get; set; } = "";
}
