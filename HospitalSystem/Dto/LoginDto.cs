using System.ComponentModel.DataAnnotations;
//IMPORTANT

public class LoginDto
{
   [Required]
   [MinLength(3)]
   public string Name { get; set; }

   [Required]
   [MinLength(3)]
   public string Password { get; set; }

}