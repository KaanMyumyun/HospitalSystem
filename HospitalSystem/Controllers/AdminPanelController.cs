using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;


[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Doctor")]
public class AdminPanelController : ControllerBase
{
    
}