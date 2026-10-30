using HospitalSystem.Interfaces;
using HospitalSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

[ApiController]
[Route("api/audit-logs")]
public class AuditLogsController : ControllerBase
{
    [Authorize(Policy = Access.Admin)]
    [HttpGet]
    public async Task<ActionResult<ServiceResult<PagedResult<AuditLogEntryDto>>>> ListAuditLogs(
        [FromQuery] AuditLogQueryDto query, [FromServices] IAuditLogQueryService service, CancellationToken cancellationToken)
        => this.ToActionResult(await service.ListAsync(query, cancellationToken));
}
