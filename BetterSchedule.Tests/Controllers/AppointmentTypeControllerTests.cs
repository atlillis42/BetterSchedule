using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using BetterSchedule.Server.Controllers;
using Tests.Controllers;

namespace Tests.Controllers;

public sealed class AppointmentTypeControllerTests : ControllerTestBase
{
    public AppointmentTypeControllerTests(WebApplicationFactory<BetterSchedule.Server.Program> factory) : base(factory) { }

    private sealed record AppointmentTypeDto(int Id, string Name);

    [Fact]
    public async Task List_ReturnsAppointmentTypes()
    {
        await LoginAsDevAsync();
        var types = await Client.GetFromJsonAsync<List<AppointmentTypeDto>>("/api/appointmenttype");
        Assert.NotNull(types);
        Assert.NotEmpty(types!);
    }
}