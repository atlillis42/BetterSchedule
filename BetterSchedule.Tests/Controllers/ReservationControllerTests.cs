using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Tests.Controllers;

namespace Tests.Controllers;

public sealed class ReservationControllerTests : ControllerTestBase
{
    public ReservationControllerTests(WebApplicationFactory<BetterSchedule.Server.Program> factory) : base(factory) { }

    private sealed record ReservationDto(int Id);

    [Fact]
    public async Task List_ReturnsReservations()
    {
        await LoginAsDevAsync();
        var reservations = await Client.GetFromJsonAsync<List<ReservationDto>>("/api/reservation");
        Assert.NotNull(reservations);
        Assert.NotEmpty(reservations!);
    }
}