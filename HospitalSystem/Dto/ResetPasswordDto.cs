using System.ComponentModel.DataAnnotations;

public class ResetPasswordDto
{
    public int UserId { get; set; }
    [Required]
    [MinLength(8, ErrorMessage = "Password must be at least 8 characters long")]
    public string NewPassword { get; set; }
}
