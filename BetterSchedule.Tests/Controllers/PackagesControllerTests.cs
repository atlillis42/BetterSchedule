using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Tests.Controllers;

namespace Tests.Controllers;

public sealed class PackagesControllerTests : ControllerTestBase
{
    public PackagesControllerTests(WebApplicationFactory<BetterSchedule.Server.Program> factory) : base(factory) { }

    private sealed record PackageDto(int Id, string Name);

    [Fact]
    public async Task List_ReturnsPackages()
    {
        await LoginAsDevAsync();
        var packages = await Client.GetFromJsonAsync<List<PackageDto>>("/api/packages");
        Assert.NotNull(packages);
        Assert.NotEmpty(packages!);
    }
}