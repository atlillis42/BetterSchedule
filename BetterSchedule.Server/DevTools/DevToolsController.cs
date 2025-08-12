#if DEBUG
using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.BlockedTime;
using BetterSchedule.Server.Models.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.DevTools;

[ApiController]
[Route("api/devtools")]
[ApiExplorerSettings(IgnoreApi = true)] // hide from Swagger
[Authorize] // require auth by default
public class DevToolsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IWebHostEnvironment _env;

    public DevToolsController(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IWebHostEnvironment env)
    {
        _db = db;
        _userManager = userManager;
        _roleManager = roleManager;
        _env = env;
    }

    // GET /api/devtools/whoami
    // Quick claims check
    [HttpGet("whoami")]
    public IActionResult WhoAmI()
    {
        var orgId = User.TryGetOrgId(out var o) ? o : "(none)";
        return Ok(new
        {
            env = _env.EnvironmentName,
            user = User.Identity?.Name,
            userId = User.GetUserId(),
            roles = User.Claims.Where(c => c.Type == System.Security.Claims.ClaimTypes.Role).Select(c => c.Value),
            organizationId = orgId
        });
    }

    // POST /api/devtools/reset-db
    // Reset + reseed domain data. DEBUG builds + Development env only.
    [HttpPost("reset-db")]
    [Authorize(Roles = "Manager")]
    public async Task<IActionResult> ResetDevDatabaseAsync()
    {
        if (!_env.IsDevelopment())
            return Forbid("reset-db is only allowed in Development.");

        await DbInitializer.SeedAsync(_db, _userManager, _roleManager, reset: true);
        return Ok(new { status = "reset complete" });
    }

    // GET /api/devtools/blockedtimes/all
    // Returns *org-scoped* blocked times for the signed-in user
    [HttpGet("blockedtimes/all")]
    public async Task<IActionResult> GetAllBlockedTimesAsync(CancellationToken ct)
    {
        if (!_env.IsDevelopment())
            return Forbid("devtools endpoints are only allowed in Development.");

        var orgId = User.GetOrgIdOrThrow();

        var blocks = await _db.BlockedTimes
            .AsNoTracking()
            .Where(b => b.OrganizationId == orgId && !b.IsDeleted)
            .OrderBy(b => b.StartTime)
            .Select(b => new BlockedTimeDto
            {
                Id = b.Id,
                OrganizationId = b.OrganizationId, 
                Reason = b.Reason!,
                StartTime = b.StartTime,
                EndTime = b.EndTime,
                ResourceId = b.ResourceId,
                BackColor = b.BackColor,
                IsDeleted = b.IsDeleted
            })
            .ToListAsync(ct);

        return Ok(blocks);
    }
}
#endif
