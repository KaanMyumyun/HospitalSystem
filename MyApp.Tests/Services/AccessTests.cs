using HospitalSystem.Interfaces;
using HospitalSystem.Services;
using Moq;

namespace HospitalSystem.Tests;

public class AccessTests
{
    private static ICurrentUserService UserIn(UserRole role)
    {
        var mock = new Mock<ICurrentUserService>();
        mock.Setup(x => x.IsInRole(It.IsAny<UserRole>())).Returns<UserRole>(r => r == role);
        return mock.Object;
    }

    [Theory]
    [InlineData(UserRole.Admin, true)]
    [InlineData(UserRole.FrontDesk, true)]
    [InlineData(UserRole.DemoAdmin, true)]
    [InlineData(UserRole.DemoFrontDesk, true)]
    [InlineData(UserRole.Doctor, false)]
    [InlineData(UserRole.Pending, false)]
    public void CanReadReferenceData_IsForTheAdminAndReceptionScreens(UserRole role, bool canRead)
    {
        Assert.Equal(canRead, UserIn(role).CanReadReferenceData());
    }

    [Fact]
    public void RequireAdmin_ForAnAdmin_RefusesNothing()
    {
        Assert.Null(UserIn(UserRole.Admin).RequireAdmin<CalendarActionResult>("create a schedule"));
    }

    [Theory]
    [InlineData(UserRole.DemoAdmin)]
    [InlineData(UserRole.FrontDesk)]
    public void RequireAdmin_ForAnyoneElse_IsAForbiddenResult(UserRole role)
    {
        var refusal = UserIn(role).RequireAdmin<CalendarActionResult>("create a schedule");

        Assert.NotNull(refusal);
        Assert.False(refusal.IsSuccess);
        Assert.Equal(FailureKind.Forbidden, refusal.Failure);
        Assert.Equal("You are not allowed to create a schedule", refusal.Error);
    }
}
