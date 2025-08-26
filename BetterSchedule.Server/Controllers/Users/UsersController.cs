using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.Users;
using BetterSchedule.Server.Models.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Controllers.Users
{
    [ApiController]
    [Route("api/users")]
    [Authorize]
    public sealed class UsersController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;


        /// <summary>
        /// Initializes a new instance of the <see cref="UsersController"/> class.
        /// </summary>
        /// <param name="userManager">Identity user manager for role assignments.</param>
        public UsersController(ApplicationDbContext db, UserManager<ApplicationUser> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        /// <summary>
        /// Returns a lightweight list of service providers for selection UIs.
        /// </summary>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>Collection of provider DTOs.</returns>
        [HttpGet("providers-lite")]
        public async Task<ActionResult<IEnumerable<ProviderLiteDto>>> GetProvidersLite(CancellationToken ct)
        {
            var providers = await QueryProviders()
                .Select(u => new ProviderLiteDto
                {
                    Id = u.Id,
                    Name = string.IsNullOrWhiteSpace(u.FullName) ? (u.UserName ?? u.Email ?? u.Id) : u.FullName
                })
                .OrderBy(p => p.Name)
                .ToListAsync(ct);

            return Ok(providers);
        }
       
        /// <summary>
        /// Returns detailed provider information with optional search and pagination.
        /// </summary>
        /// <param name="q">Optional search term.</param>
        /// <param name="take">Optional maximum number of records to return.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>Collection of provider DTOs.</returns>
        [HttpGet("providers")]
        public async Task<ActionResult<IEnumerable<ProviderDto>>> GetProviders(
            [FromQuery] string? q,
            [FromQuery] int? take,
            CancellationToken ct)
        {
            var query = QueryProviders();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                query = query.Where(u =>
                    (u.FullName != null && EF.Functions.Like(u.FullName, $"%{term}%")) ||
                    (u.UserName != null && EF.Functions.Like(u.UserName, $"%{term}%")) ||
                    (u.Email != null && EF.Functions.Like(u.Email, $"%{term}%"))
                );
            }

            var pageSize = Math.Clamp(take ?? 100, 1, 500);

            var items = await query
                .OrderBy(u => u.FullName ?? u.UserName ?? u.Email ?? u.Id)
                .Take(pageSize)
                .Select(u => new ProviderDto
                {
                    Id = u.Id,
                    Name = string.IsNullOrWhiteSpace(u.FullName) ? (u.UserName ?? u.Email ?? u.Id) : u.FullName,
                    UserName = u.UserName,
                    Email = u.Email
                })
                .ToListAsync(ct);

            return Ok(items);
        }


        private static readonly string[] AllowedRoles = { "Manager", "ServiceProvider", "Client" };

        /// <summary>
        /// Returns users in the current organization with their roles.
        /// </summary>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>Collection of user DTOs.</returns>
        [HttpGet]
        [Authorize(Roles = "Manager")]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetUsers(CancellationToken ct)
        {
            var users = await _db.Users
                .Where(u => u.OrganizationId == OrganizationId)
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    Name = string.IsNullOrWhiteSpace(u.FullName) ? (u.UserName ?? u.Email ?? u.Id) : u.FullName,
                    UserName = u.UserName,
                    Email = u.Email,
                    Roles = (from ur in _db.UserRoles
                             join r in _db.Roles on ur.RoleId equals r.Id
                             where ur.UserId == u.Id
                             select r.Name).ToList()
                })
                .OrderBy(u => u.Name)
                .ToListAsync(ct);

            return Ok(users);
        }

        /// <summary>
        /// Adds an allowed role to a user within the organization.
        /// </summary>
        /// <param name="userId">Target user identifier.</param>
        /// <param name="role">Role to add.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>No content on success.</returns>
        [HttpPost("{userId}/roles/{role}")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> AddRole(string userId, string role, CancellationToken ct)
        {
            if (!AllowedRoles.Contains(role)) return BadRequest("Invalid role.");

            var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId && u.OrganizationId == OrganizationId, ct);
            if (user is null) return NotFound();

            var result = await _userManager.AddToRoleAsync(user, role);
            if (!result.Succeeded) return BadRequest(result.Errors.First().Description);

            return NoContent();
        }

        /// <summary>
        /// Removes an allowed role from a user within the organization.
        /// </summary>
        /// <param name="userId">Target user identifier.</param>
        /// <param name="role">Role to remove.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>No content on success.</returns>
        [HttpDelete("{userId}/roles/{role}")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> RemoveRole(string userId, string role, CancellationToken ct)
        {
            if (!AllowedRoles.Contains(role)) return BadRequest("Invalid role.");

            var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId && u.OrganizationId == OrganizationId, ct);
            if (user is null) return NotFound();

            var result = await _userManager.RemoveFromRoleAsync(user, role);
            if (!result.Succeeded) return BadRequest(result.Errors.First().Description);

            return NoContent();
        }


        // -----------------------------
        // Internal helpers
        // -----------------------------
        /// <summary>
        /// Builds the base query for service providers in the current organization.
        /// </summary>
        /// <returns>A queryable of <see cref="ApplicationUser"/> limited to providers.</returns>
        private IQueryable<ApplicationUser> QueryProviders()
        {
            var query =
                from u in _db.Users
                join ur in _db.UserRoles on u.Id equals ur.UserId
                join r in _db.Roles on ur.RoleId equals r.Id
                where u.OrganizationId == OrganizationId && r.Name == "ServiceProvider"
                select u;

            return query.AsNoTracking();
        }
    }
}
