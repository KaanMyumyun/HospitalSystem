using System.ComponentModel.DataAnnotations;

public class CreateDepartmentDto
{

    [Required]
    [MinLength(3)]
    public string Name { get; set; }
}
