using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
//IMPORTANT
public class CreateUserDto
{
        [Required]
        [MinLength(3)]
        public string Name { get; set; }
        [Required]
        [MinLength(3)]
        public string Password { get; set; }
       
}