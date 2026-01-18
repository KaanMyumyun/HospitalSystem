using System.ComponentModel.DataAnnotations;

public class ResetPasswordDto
{
    public int UserId { get; set; }
    [Required]
    [MinLength(3)]
    public string NewPassword { get; set; }
}
