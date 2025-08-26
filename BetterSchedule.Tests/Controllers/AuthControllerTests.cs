using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Tests.Controllers;

namespace Tests.Controllers;

public sealed class AuthControllerTests : ControllerTestBase
{
    public AuthControllerTests(WebApplicationFactory<BetterSchedule.Server.Program> factory) : base(factory) { }

    private sealed record StatusResponse(bool authenticated);

    [Fact]
    public async Task Status_WhenUnauthenticated_ReturnsFalse()
    {
        var status = await Client.GetFromJsonAsync<StatusResponse>("/api/auth/status");
        Assert.NotNull(status);
        Assert.False(status!.authenticated);
    }

    [Fact]
    public async Task Status_AfterLogin_ReturnsTrue()
    {
        await LoginAsDevAsync();
        var status = await Client.GetFromJsonAsync<StatusResponse>("/api/auth/status");
        Assert.NotNull(status);
        Assert.True(status!.authenticated);
    }
}