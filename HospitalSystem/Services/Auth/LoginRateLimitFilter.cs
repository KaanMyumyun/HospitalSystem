using HospitalSystem.Dto;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace HospitalSystem.Services.Auth;

public sealed class LoginRateLimitFilter(LoginAttemptLimiter limiter) : IAsyncActionFilter
{
    private const int MaximumUserNameLength = 50;

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (!context.ActionArguments.TryGetValue("dto", out var value) || value is not LoginDto dto)
        {
            context.Result = new BadRequestObjectResult(new { error = "Invalid login request." });
            return;
        }

        if (dto.Name?.Length > MaximumUserNameLength)
        {
            context.Result = new BadRequestObjectResult(new { error = "Username must be at most 50 characters." });
            return;
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            context.Result = new BadRequestObjectResult(new { error = "Invalid login request." });
            return;
        }

        using var lease = limiter.AttemptAcquire(context.HttpContext.Connection.RemoteIpAddress, dto.Name);
        if (!lease.IsAcquired)
        {
            await RateLimitResponse.WriteAsync(context.HttpContext, lease, context.HttpContext.RequestAborted);
            context.Result = new EmptyResult();
            return;
        }

        await next();
    }
}
