#if DEBUG
using BetterSchedule.Server.Data;
using BetterSchedule.Server.Database;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BetterSchedule.Server.DevTools;

[ApiController]
[Route("api/devtools")]
public class DevToolsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public DevToolsController(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Resets and reseeds the dev database. DEBUG builds only.
    /// </summary>
    [HttpPost("reset-db")]
    [AllowAnonymous] // TODO: Restrict as needed
    public async Task<IActionResult> ResetDevDatabaseAsync()
    {
        await DbInitializer.SeedAsync(_db, reset: true);
        return Ok(new { status = "reset complete" });
    }
}
#endif
