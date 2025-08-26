using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Tests.Controllers;

namespace Tests.Controllers;

public sealed class PackageAssignmentsControllerTests : ControllerTestBase
{
    public PackageAssignmentsControllerTests(WebApplicationFactory<BetterSchedule.Server.Program> factory) : base(factory) { }

    private sealed record ClientDto(string id, string name);

    [Fact]
    public async Task ByClient_ReturnsOk()
    {
        await LoginAsDevAsync();
        var clients = await Client.GetFromJsonAsync<List<ClientDto>>("/api/clients");
        Assert.NotNull(clients);
        var clientId = clients![0].id;

        var response = await Client.GetAsync($"/api/package-assignments/by-client/{clientId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}