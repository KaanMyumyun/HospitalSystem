using HospitalSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/AuditLogs")]
public class AuditLogController : ControllerBase
{
    private readonly IAuditLogQueryService _auditLogQueryService;

    public AuditLogController(IAuditLogQueryService auditLogQueryService)
    {
        _auditLogQueryService = auditLogQueryService;
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("ListAuditLogs")]
    public async Task<ActionResult<ServiceResult<PagedResult<AuditLogEntryDto>>>> ListAuditLogs([FromQuery] AuditLogQueryDto query)
        => this.ToActionResult(await _auditLogQueryService.ListAsync(query));
}
