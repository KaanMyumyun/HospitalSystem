using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Controllers;

public static class OperationResultExtensions
{
    public static ActionResult ToActionResult(this ControllerBase controller, IOperationResult result) =>
        result.IsSuccess ? controller.Ok(result) : result.Failure switch
        {
            FailureKind.Forbidden => controller.StatusCode(StatusCodes.Status403Forbidden, result),
            FailureKind.NotFound => controller.NotFound(result),
            FailureKind.Conflict => controller.Conflict(result),
            _ => controller.BadRequest(result)
        };
}
