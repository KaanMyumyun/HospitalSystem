using System.ComponentModel.DataAnnotations;
public class CreateUserDto
{
        [Required]
        [MinLength(3, ErrorMessage = "Username must be at least 3 characters long")]
        public string Name { get; set; }
        [Required]
        [MinLength(8, ErrorMessage = "Password must be at least 8 characters long")]
        public string Password { get; set; }
       
}
