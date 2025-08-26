using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Tests.Controllers;

namespace Tests.Controllers;

public sealed class CalendarResourceControllerTests : ControllerTestBase
{
    public CalendarResourceControllerTests(WebApplicationFactory<BetterSchedule.Server.Program> factory) : base(factory) { }

    private sealed record CalendarResourceDto(int Id, string Name);

    [Fact]
    public async Task List_ReturnsResources()
    {
        await LoginAsDevAsync();
        var resources = await Client.GetFromJsonAsync<List<CalendarResourceDto>>("/api/calendar-resources");
        Assert.NotNull(resources);
        Assert.NotEmpty(resources!);
    }
}