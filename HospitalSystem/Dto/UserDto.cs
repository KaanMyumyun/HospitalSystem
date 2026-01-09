using Microsoft.AspNetCore.Identity;

public class UserDto
{
        public string Name { get; set; }
        public string Password { get; set; }
        public UserRole Role { get; set; } 
}