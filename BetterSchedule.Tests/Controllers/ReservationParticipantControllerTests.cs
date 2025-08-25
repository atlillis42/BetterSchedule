using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Tests.Controllers;

namespace Tests.Controllers;

public sealed class ReservationParticipantControllerTests : ControllerTestBase
{
    public ReservationParticipantControllerTests(WebApplicationFactory<BetterSchedule.Server.Program> factory) : base(factory) { }

    private sealed record ReservationDto(int Id);

    [Fact]
    public async Task List_ReturnsOk()
    {
        await LoginAsDevAsync();
        var reservations = await Client.GetFromJsonAsync<List<ReservationDto>>("/api/reservation");
        Assert.NotNull(reservations);
        var reservationId = reservations![0].Id;

        var response = await Client.GetAsync($"/api/reservations/{reservationId}/participants");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}