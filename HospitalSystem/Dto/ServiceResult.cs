public class ServiceResult<T>
{
    public bool IsSuccess { get; set; }
    public string Error { get; set; }
    public T Data { get; set; }

    public static ServiceResult<T> Fail(string error) =>
        new() { IsSuccess = false, Error = error };

    public static ServiceResult<T> Success(T data) =>
        new() { IsSuccess = true, Data = data };
}
