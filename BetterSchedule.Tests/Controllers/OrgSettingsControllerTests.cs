using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Tests.Controllers;

namespace Tests.Controllers;

public sealed class OrgSettingsControllerTests : ControllerTestBase
{
    public OrgSettingsControllerTests(WebApplicationFactory<BetterSchedule.Server.Program> factory) : base(factory) { }

    [Fact]
    public async Task Get_ReturnsOk()
    {
        await LoginAsDevAsync();
        var response = await Client.GetAsync("/api/org-settings");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}