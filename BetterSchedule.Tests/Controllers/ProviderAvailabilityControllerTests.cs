using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Tests.Controllers;

namespace Tests.Controllers;

public sealed class ProviderAvailabilityControllerTests : ControllerTestBase
{
    public ProviderAvailabilityControllerTests(WebApplicationFactory<BetterSchedule.Server.Program> factory) : base(factory) { }

    private sealed record ProviderAvailabilityDto(int Id);

    [Fact]
    public async Task List_ReturnsAvailabilities()
    {
        await LoginAsDevAsync();
        var items = await Client.GetFromJsonAsync<List<ProviderAvailabilityDto>>("/api/provider-availability");
        Assert.NotNull(items);
        Assert.NotEmpty(items!);
    }
}