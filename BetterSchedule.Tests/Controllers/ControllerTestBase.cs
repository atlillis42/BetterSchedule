using System.Net.Http;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Tests.Controllers;

public abstract class ControllerTestBase : IClassFixture<WebApplicationFactory<BetterSchedule.Server.Program>>
{
    protected readonly HttpClient Client;

    protected ControllerTestBase(WebApplicationFactory<BetterSchedule.Server.Program> factory)
    {
        Client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
    }

    protected async Task LoginAsDevAsync()
    {
        var response = await Client.PostAsync("/api/dev/login", null);
        response.EnsureSuccessStatusCode();
    }
}