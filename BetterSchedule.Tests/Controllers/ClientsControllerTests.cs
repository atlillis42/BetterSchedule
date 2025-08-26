using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Tests.Controllers;

namespace Tests.Controllers;

public sealed class ClientsControllerTests : ControllerTestBase
{
    public ClientsControllerTests(WebApplicationFactory<BetterSchedule.Server.Program> factory) : base(factory) { }

    private sealed record ClientDto(string id, string name);

    [Fact]
    public async Task Search_ReturnsClients()
    {
        await LoginAsDevAsync();
        var clients = await Client.GetFromJsonAsync<List<ClientDto>>("/api/clients");
        Assert.NotNull(clients);
        Assert.NotEmpty(clients!);
    }
}