#if DEBUG
using BetterSchedule.Server.Database;
using BetterSchedule.Server.DevTools.Seeding;
using BetterSchedule.Server.Models.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace BetterSchedule.Server.DevTools
{
    /// <summary>Development-only utilities (reset DB). Hidden from Swagger.</summary>
    [ApiController]
    [Route("api/devtools")]
    [ApiExplorerSettings(IgnoreApi = true)]
    [Authorize(Roles = "Manager")]
    public class DevToolsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly IWebHostEnvironment _env;
        private readonly SeedOptions _seedOptions;

        public DevToolsController(
            ApplicationDbContext db,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IOptions<SeedOptions> seedOptions,
            IWebHostEnvironment env)
        {
            _db = db;
            _userManager = userManager;
            _roleManager = roleManager;
            _env = env;
            _seedOptions = seedOptions.Value;
        }

        /// <summary>Resets and reseeds domain data (Development only).</summary>
        [HttpPost("reset-db")]
        public async Task<IActionResult> ResetDevDatabaseAsync()
        {
            if (!_env.IsDevelopment())
                return Forbid("reset-db is only allowed in Development.");

            // Copy current options but force a reset this run
            var opts = new SeedOptions
            {
                Enabled = true,
                Profile = _seedOptions.Profile,
                RollingDates = _seedOptions.RollingDates,
                AnchorLocalDate = _seedOptions.AnchorLocalDate,
                Reset = true,
                Scenarios = _seedOptions.Scenarios
            };

            await SeedRunner.ExecuteAsync(_db, _userManager, _roleManager, opts);
            return Ok(new { status = "reset complete" });
        }
    }
}
#endif
