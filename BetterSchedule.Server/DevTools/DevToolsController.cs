#if DEBUG
using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.BlockedTime;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Services.Demo; 
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.DevTools;

[ApiController]
[Route("api/devtools")]
[ApiExplorerSettings(IgnoreApi = true)]
[Authorize]
public class DevToolsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IWebHostEnvironment _env;
    private readonly ISandboxService _sandbox; 

    public DevToolsController(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        IWebHostEnvironment env,
        ISandboxService sandbox) 
    {
        _db = db;
        _userManager = userManager;
        _env = env;
        _sandbox = sandbox; 
    }

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

    // Replaces old "reset + reseed" with Sandbox reset of the caller's org
    [HttpPost("reset-db")]
    [Authorize(Roles = "Manager")]
    public async Task<IActionResult> ResetDevDatabaseAsync(CancellationToken ct)
    {
        if (!_env.IsDevelopment())
            return Forbid("reset-db is only allowed in Development.");

        var orgId = User.GetOrgIdOrThrow();
        var userId = User.GetUserIdOrThrow();

        var org = await _sandbox.ResetSandboxAsync(orgId, userId, ct);
        return Ok(new { status = "reset complete", organizationId = org.Id });
    }

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
