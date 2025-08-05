#if DEBUG
using BetterSchedule.Server.Data;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.Calendar;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.DevTools;

[ApiController]
[Route("api/devtools")]
public class DevToolsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;

    public DevToolsController(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager)
    {
        _db = db;
        _userManager = userManager;
        _roleManager = roleManager;
    }

    /// <summary>
    /// Resets and reseeds the dev database. DEBUG builds only.
    /// </summary>
    [HttpPost("reset-db")]
    [AllowAnonymous] // TODO: Restrict as needed
    public async Task<IActionResult> ResetDevDatabaseAsync()
    {
        await DbInitializer.SeedAsync(_db, _userManager, _roleManager, reset: true);
        return Ok(new { status = "reset complete" });
    }

    [HttpGet("blockedtimes/all")]
    [AllowAnonymous] // Or [Authorize(Roles = "Manager")] if you want to restrict it
    public async Task<IActionResult> GetAllBlockedTimesAsync()
    {
        var blocks = await _db.BlockedTimes
            .AsNoTracking()
            .Where(b => !b.IsDeleted)   // Only return not-deleted!
            .Select(b => new BlockedTimeDto
            {
                Id = b.Id,
                Reason = b.Reason,
                StartTime = b.StartTime,
                EndTime = b.EndTime,
                ResourceId = b.ResourceId,
                BackColor = b.BackColor
            })
            .ToListAsync();

        return Ok(blocks);
    }
}

#endif
