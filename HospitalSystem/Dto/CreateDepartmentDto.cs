using System.ComponentModel.DataAnnotations;

namespace HospitalSystem.Dto;

public class CreateDepartmentDto
{

    [Required]
    [MinLength(3)]
    public string Name { get; set; }
}
