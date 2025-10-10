using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.Organization; 
using BetterSchedule.Server.Models.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

// Type aliases to avoid namespace/type collisions
using OrganizationEntity = BetterSchedule.Server.Models.Tenant.Organization;
using OrganizationSettingsEntity = BetterSchedule.Server.Models.Tenant.OrganizationSettings;

namespace BetterSchedule.Server.Controllers.Organization
{
    /// <summary>
    /// Lists organizations and lets a user join or create one.
    /// NOTE: This controller does NOT inherit OrgControllerBase because users may not have an org yet.
    /// </summary>
    [ApiController]
    [Route("api/orgs")]
    [Authorize]
    public sealed class OrganizationsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<OrganizationsController> _logger;

        public OrganizationsController(
            ApplicationDbContext db,
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            RoleManager<IdentityRole> roleManager,
            IWebHostEnvironment env,
            ILogger<OrganizationsController> logger)
        {
            _db = db;
            _userManager = userManager;
            _signInManager = signInManager;
            _roleManager = roleManager;
            _env = env;
            _logger = logger;
        }

        // --------------------------------------------------------------------
        // LIST
        // --------------------------------------------------------------------
        /// <summary>Lists organizations (simple search + paging).</summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<OrganizationLiteDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> List([FromQuery] string? q, [FromQuery] int? take, CancellationToken ct)
        {
            var query = _db.Organizations.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                query = query.Where(o => EF.Functions.Like(o.Name, $"%{term}%"));
            }

            var pageSize = Math.Clamp(take ?? 50, 1, 200);

            var items = await query
                .OrderBy(o => o.Name)
                .Take(pageSize)
                .Select(o => new OrganizationLiteDto { Id = o.Id, Name = o.Name })
                .ToListAsync(ct);

            return Ok(items);
        }

        // --------------------------------------------------------------------
        // JOIN EXISTING
        // --------------------------------------------------------------------
        /// <summary>Joins an existing organization as a Client (also sets OrganizationId on the user).</summary>
        [HttpPost("join/{organizationId}")]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Join([FromRoute] string organizationId, CancellationToken ct)
        {
            const string Step = "JOIN_ORG";
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrWhiteSpace(userId))
                    return Unauthorized(new { message = "Not authenticated." });

                var user = await _userManager.Users.SingleOrDefaultAsync(u => u.Id == userId, ct);
                if (user is null) return Unauthorized(new { message = "User not found." });

                var org = await _db.Organizations.AsNoTracking().SingleOrDefaultAsync(o => o.Id == organizationId, ct);
                if (org is null) return NotFound(new { message = "Organization not found." });

                using var tx = await _db.Database.BeginTransactionAsync(ct);

                user.OrganizationId = org.Id;
                await _db.SaveChangesAsync(ct);

                // Assign Client role (roles should already be seeded)
                var addRole = await _userManager.AddToRoleAsync(user, "Client");
                if (!addRole.Succeeded)
                    return BadRequest(new { message = addRole.Errors.First().Description });

                await tx.CommitAsync(ct);

                // Refresh cookie so org_id claim appears immediately
                await _signInManager.RefreshSignInAsync(user);

                return Ok(new { organizationId = org.Id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "{Step} failed for orgId {OrgId}", Step, organizationId);
                return DevProblem("Failed to join organization.", ex);
            }
        }

        // --------------------------------------------------------------------
        // CREATE NEW
        // --------------------------------------------------------------------
        /// <summary>Creates a new organization and makes the caller a Manager in it.</summary>
        [HttpPost("create")]
        [Consumes("application/json")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Create([FromBody] CreateOrganizationRequest body, CancellationToken ct)
        {
            const string Step = "CREATE_ORG";
            try
            {
                // [ApiController] will 400 on invalid model state automatically; this trim is just user-friendliness.
                var name = (body.Name ?? string.Empty).Trim();
                if (name.Length == 0)
                    return BadRequest(new { message = "Name is required." });
                if (name.Length > 128)
                    return BadRequest(new { message = "Name is too long." });

                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrWhiteSpace(userId))
                    return Unauthorized(new { message = "Not authenticated." });

                var user = await _userManager.Users.SingleOrDefaultAsync(u => u.Id == userId, ct);
                if (user is null) return Unauthorized(new { message = "User not found." });

                using var tx = await _db.Database.BeginTransactionAsync(ct);

                // 1) Create organization
                var org = new OrganizationEntity { Name = name };
                _db.Organizations.Add(org);
                await _db.SaveChangesAsync(ct);

                // 2) Move caller into the new org
                user.OrganizationId = org.Id;
                await _db.SaveChangesAsync(ct);

                // 3) Assign Manager role (assumes roles are already seeded)
                var addRole = await _userManager.AddToRoleAsync(user, "Manager");
                if (!addRole.Succeeded)
                    return BadRequest(new { message = addRole.Errors.First().Description });

                // 4) Ensure default settings row (idempotent)
                var hasSettings = await _db.OrganizationSettings.AnyAsync(s => s.OrganizationId == org.Id, ct);
                if (!hasSettings)
                {
                    _db.OrganizationSettings.Add(new OrganizationSettingsEntity { OrganizationId = org.Id });
                    await _db.SaveChangesAsync(ct);
                }

                await tx.CommitAsync(ct);

                // 5) Refresh cookie so org_id claim appears immediately
                await _signInManager.RefreshSignInAsync(user);

                return Ok(new { organizationId = org.Id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "{Step} failed for name {Name}", Step, body?.Name);
                return DevProblem("Failed to create organization.", ex);
            }
        }

        /// <summary>
        /// When running in Development, return the exception detail to the client to speed up diagnosis.
        /// In non-Development, return a generic problem.
        /// </summary>
        private ObjectResult DevProblem(string message, Exception ex)
        {
            if (_env.IsDevelopment())
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message,
                    detail = ex.ToString()
                });
            }

            return StatusCode(StatusCodes.Status500InternalServerError, new { message });
        }
    }
}
