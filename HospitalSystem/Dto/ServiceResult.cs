using System.Text.Json.Serialization;

namespace HospitalSystem.Dto;

public class ServiceResult<T> : IOperationResult
{
    public bool IsSuccess { get; set; }
    public string? Error { get; set; }
    public T? Data { get; set; }

    [JsonIgnore]
    public FailureKind Failure { get; set; }

    public static ServiceResult<T> Fail(string error, FailureKind failure = FailureKind.Invalid) =>
        new() { IsSuccess = false, Error = error, Failure = failure };

    public static ServiceResult<T> Forbidden(string error) => Fail(error, FailureKind.Forbidden);
    public static ServiceResult<T> NotFound(string error) => Fail(error, FailureKind.NotFound);

    public static ServiceResult<T> Success(T data) =>
        new() { IsSuccess = true, Data = data };
}
