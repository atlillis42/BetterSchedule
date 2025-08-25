using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Tests.Controllers;

namespace Tests.Controllers;

public sealed class UsersControllerTests : ControllerTestBase
{
    public UsersControllerTests(WebApplicationFactory<BetterSchedule.Server.Program> factory) : base(factory) { }

    private sealed record ProviderLiteDto(string Id, string Name);

    [Fact]
    public async Task ProvidersLite_ReturnsProviders()
    {
        await LoginAsDevAsync();
        var providers = await Client.GetFromJsonAsync<List<ProviderLiteDto>>("/api/users/providers-lite");
        Assert.NotNull(providers);
        Assert.NotEmpty(providers!);
    }
}