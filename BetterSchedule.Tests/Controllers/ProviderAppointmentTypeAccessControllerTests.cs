using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Tests.Controllers;

namespace Tests.Controllers;

public sealed class ProviderAppointmentTypeAccessControllerTests : ControllerTestBase
{
    public ProviderAppointmentTypeAccessControllerTests(WebApplicationFactory<BetterSchedule.Server.Program> factory) : base(factory) { }

    private sealed record ProviderLiteDto(string Id, string Name);

    [Fact]
    public async Task ByProvider_ReturnsOk()
    {
        await LoginAsDevAsync();
        var providers = await Client.GetFromJsonAsync<List<ProviderLiteDto>>("/api/users/providers-lite");
        Assert.NotNull(providers);
        var providerId = providers![0].Id;

        var response = await Client.GetAsync($"/api/provider-appointment-type-access/by-provider/{providerId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}