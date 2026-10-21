using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

// Why a request failed. The controller turns it into the status code:
// 400, 403, 404 or 409.
public enum FailureKind
{
    Invalid,
    Forbidden,
    NotFound,
    Conflict
}

public interface IOperationResult
{
    bool IsSuccess { get; }
    FailureKind Failure { get; }
}

// Success, or an error message and the kind of failure. TSelf is the concrete
// result type, so Fail and the other factories return it.
public abstract class OperationResult<TSelf> : IOperationResult
    where TSelf : OperationResult<TSelf>, new()
{
    public bool IsSuccess { get; set; }
    public string? Error { get; set; }

    [JsonIgnore]
    public FailureKind Failure { get; set; }

    public static TSelf Success() => new() { IsSuccess = true };

    public static TSelf Fail(string error, FailureKind failure = FailureKind.Invalid) =>
        new() { Error = error, Failure = failure };

    public static TSelf Forbidden(string error) => Fail(error, FailureKind.Forbidden);
    public static TSelf NotFound(string error) => Fail(error, FailureKind.NotFound);
    public static TSelf Conflict(string error) => Fail(error, FailureKind.Conflict);
}
