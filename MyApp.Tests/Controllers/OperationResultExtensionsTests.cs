using HospitalSystem.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace HospitalSystem.Tests;

public class OperationResultExtensionsTests
{
    private sealed class TestController : ControllerBase
    {
    }

    [Theory]
    [InlineData(FailureKind.Invalid, StatusCodes.Status400BadRequest)]
    [InlineData(FailureKind.Forbidden, StatusCodes.Status403Forbidden)]
    [InlineData(FailureKind.NotFound, StatusCodes.Status404NotFound)]
    [InlineData(FailureKind.Conflict, StatusCodes.Status409Conflict)]
    public void Failure_GetsItsStatusCodeAndTheResultAsBody(FailureKind failure, int statusCode)
    {
        var result = CalendarActionResult.Fail("Nope", failure);

        var response = Assert.IsAssignableFrom<ObjectResult>(new TestController().ToActionResult(result));

        Assert.Equal(statusCode, response.StatusCode);
        Assert.Same(result, response.Value);
    }

    [Fact]
    public void Success_Is200WithTheResult()
    {
        var result = CalendarActionResult.Success();

        var response = Assert.IsType<OkObjectResult>(new TestController().ToActionResult(result));

        Assert.Same(result, response.Value);
    }
}
