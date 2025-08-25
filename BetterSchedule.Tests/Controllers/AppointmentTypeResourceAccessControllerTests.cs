using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Tests.Controllers;

namespace Tests.Controllers;

public sealed class AppointmentTypeResourceAccessControllerTests : ControllerTestBase
{
    public AppointmentTypeResourceAccessControllerTests(WebApplicationFactory<BetterSchedule.Server.Program> factory) : base(factory) { }

    private sealed record AppointmentTypeDto(int Id, string Name);

    [Fact]
    public async Task ByType_ReturnsOk()
    {
        await LoginAsDevAsync();
        var types = await Client.GetFromJsonAsync<List<AppointmentTypeDto>>("/api/appointmenttype");
        Assert.NotNull(types);
        var typeId = types![0].Id;

        var response = await Client.GetAsync($"/api/appointment-type-resource-access/by-type/{typeId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}