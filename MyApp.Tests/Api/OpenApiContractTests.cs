using System.Text.Json;
using System.Text.Json.Nodes;

namespace HospitalSystem.Tests;

public class OpenApiContractTests
{
    private const string UpdateVariable = "UPDATE_OPENAPI";

    [Fact]
    public async Task CommittedSpecMatchesTheApi()
    {
        await using var factory = TestApp.Create("Development");

        var served = Normalize(await factory.CreateClient().GetStringAsync("/swagger/v1/swagger.json"));
        var path = Path.Combine(RepositoryRoot(), "hospital-frontend", "openapi.json");

        if (Environment.GetEnvironmentVariable(UpdateVariable) == "1")
        {
            await File.WriteAllTextAsync(path, served);
            return;
        }

        var committed = File.Exists(path) ? Normalize(await File.ReadAllTextAsync(path)) : "";
        Assert.True(committed == served,
            $"hospital-frontend/openapi.json does not match the API. Run `{UpdateVariable}=1 dotnet test " +
            "--filter OpenApiContractTests`, then `npm run generate:api` in hospital-frontend.");
    }

    private static string Normalize(string json) =>
        JsonNode.Parse(json)!.ToJsonString(new JsonSerializerOptions { WriteIndented = true }).Replace("\r\n", "\n") + "\n";

    private static string RepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "HospitalSystem.sln")))
            directory = directory.Parent;

        return directory?.FullName ?? throw new InvalidOperationException("HospitalSystem.sln not found above the test output.");
    }
}
