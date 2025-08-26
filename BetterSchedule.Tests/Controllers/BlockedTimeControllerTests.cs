using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Tests.Controllers;

namespace Tests.Controllers;

public sealed class BlockedTimeControllerTests : ControllerTestBase
{
    public BlockedTimeControllerTests(WebApplicationFactory<BetterSchedule.Server.Program> factory) : base(factory) { }

    private sealed record BlockedTimeDto(int Id);

    [Fact]
    public async Task List_ReturnsBlockedTimes()
    {
        await LoginAsDevAsync();
        var items = await Client.GetFromJsonAsync<List<BlockedTimeDto>>("/api/blocked-times");
        Assert.NotNull(items);
        Assert.NotEmpty(items!);
    }
}