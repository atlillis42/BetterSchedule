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
    /// <summary>
    /// Organization-scoped user utilities and role management.
    /// Provides lightweight/detailed lists for Service Providers and Clients,
    /// plus Manager-only full user listings and role assignment endpoints.
    /// </summary>
    [ApiController]
    [Route("api/users")]
    [Authorize]
    public sealed class UsersController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;

        public UsersController(ApplicationDbContext db, UserManager<ApplicationUser> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        /// <summary>
        /// Authoritative, allowed role names for assignment within an organization.
        /// </summary>
        private static readonly string[] AllowedRoles = { "Manager", "ServiceProvider", "Client" };

        // ---------------------------------------------------------------------
        // Roles metadata
        // ---------------------------------------------------------------------

        /// <summary>
        /// Returns the list of allowed role names for the current tenant.
        /// </summary>
        [HttpGet("roles")]
        [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
        public ActionResult<IEnumerable<string>> GetAllowedRoles()
        {
            return Ok(AllowedRoles);
        }

        // ---------------------------------------------------------------------
        // Providers
        // ---------------------------------------------------------------------

        /// <summary>
        /// Returns a lightweight list of service providers for selection UIs.
        /// Includes <see cref="ProviderLiteDto.AvailabilityPublic"/> for client visibility.
        /// </summary>
        [HttpGet("providers-lite")]
        [ProducesResponseType(typeof(IEnumerable<ProviderLiteDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<ProviderLiteDto>>> GetProvidersLite(CancellationToken ct)
        {
            var providers = await QueryUsersByRole("ServiceProvider")
                .Select(u => new ProviderLiteDto
                {
                    Id = u.Id,
                    Name = string.IsNullOrWhiteSpace(u.FullName) ? (u.UserName ?? u.Email ?? u.Id) : u.FullName,
                    AvailabilityPublic = u.AvailabilityPublic
                })
                .OrderBy(p => p.Name)
                .ToListAsync(ct);

            return Ok(providers);
        }

        /// <summary>
        /// Resolves a single service provider (by GUID) to a lightweight display record.
        /// Mirrors the shape of <see cref="ProviderLiteDto"/>.
        /// </summary>
        /// <param name="id">Provider user identifier (GUID).</param>
        [HttpGet("providers-lite/{id}")]
        [ProducesResponseType(typeof(ProviderLiteDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ProviderLiteDto>> GetProviderLiteById([FromRoute] string id, CancellationToken ct)
        {
            var item = await QueryUsersByRole("ServiceProvider")
                .Where(u => u.Id == id)
                .Select(u => new ProviderLiteDto
                {
                    Id = u.Id,
                    Name = string.IsNullOrWhiteSpace(u.FullName) ? (u.UserName ?? u.Email ?? u.Id) : u.FullName,
                    AvailabilityPublic = u.AvailabilityPublic
                })
                .SingleOrDefaultAsync(ct);

            if (item is null) return NotFound();
            return Ok(item);
        }

        /// <summary>
        /// Returns detailed provider information with optional search and pagination.
        /// Includes <see cref="ProviderLiteDto.AvailabilityPublic"/>.
        /// </summary>
        [HttpGet("providers")]
        [ProducesResponseType(typeof(IEnumerable<ProviderDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<ProviderDto>>> GetProviders(
            [FromQuery] string? q,
            [FromQuery] int? take,
            CancellationToken ct)
        {
            var query = QueryUsersByRole("ServiceProvider");

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
                    Email = u.Email,
                    AvailabilityPublic = u.AvailabilityPublic
                })
                .ToListAsync(ct);

            return Ok(items);
        }

        /// <summary>
        /// Sets a provider’s <c>AvailabilityPublic</c> flag.
        /// Managers may update any provider in the org; providers may update their own flag.
        /// </summary>
        /// <param name="userId">Target provider id.</param>
        /// <param name="body">Payload with the desired boolean value.</param>
        [HttpPut("providers/{userId}/availability-public")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> SetAvailabilityPublic([FromRoute] string userId, [FromBody] SetAvailabilityPublicDto body, CancellationToken ct)
        {
            var actingIsManager = User.IsInRole("Manager");
            var actingIsProvider = User.IsInRole("ServiceProvider");

            if (actingIsProvider && !actingIsManager && UserId != userId)
                return Forbid();

            var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId && u.OrganizationId == OrganizationId, ct);
            if (user is null) return NotFound();

            if (!await _userManager.IsInRoleAsync(user, "ServiceProvider"))
                return BadRequest("User is not a ServiceProvider.");

            user.AvailabilityPublic = body.Value;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        /// <summary>
        /// Request body for <see cref="SetAvailabilityPublic(string, SetAvailabilityPublicDto, CancellationToken)"/>.
        /// </summary>
        public sealed record SetAvailabilityPublicDto(bool Value);

        // ---------------------------------------------------------------------
        // Clients
        // ---------------------------------------------------------------------

        /// <summary>
        /// Returns a lightweight list of clients for selection UIs.
        /// </summary>
        [HttpGet("clients-lite")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        [ProducesResponseType(typeof(IEnumerable<ClientLiteDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<ClientLiteDto>>> GetClientsLite(
            [FromQuery] string? q,
            [FromQuery] int? take,
            CancellationToken ct)
        {
            var query = QueryUsersByRole("Client");

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                query = query.Where(u =>
                    (u.FullName != null && EF.Functions.Like(u.FullName, $"%{term}%")) ||
                    (u.Email != null && EF.Functions.Like(u.Email, $"%{term}%")));
            }

            var pageSize = Math.Clamp(take ?? 100, 1, 500);

            var items = await query
                .OrderBy(u => u.FullName ?? u.Email ?? u.UserName ?? u.Id)
                .Take(pageSize)
                .Select(u => new ClientLiteDto
                {
                    Id = u.Id,
                    Name = string.IsNullOrWhiteSpace(u.FullName) ? (u.Email ?? u.UserName ?? u.Id) : u.FullName
                })
                .ToListAsync(ct);

            return Ok(items);
        }

        /// <summary>
        /// Resolves a single client (by GUID) to a lightweight display record.
        /// </summary>
        [HttpGet("clients-lite/{id}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        [ProducesResponseType(typeof(ClientLiteDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ClientLiteDto>> GetClientLiteById([FromRoute] string id, CancellationToken ct)
        {
            var item = await QueryUsersByRole("Client")
                .Where(u => u.Id == id)
                .Select(u => new ClientLiteDto
                {
                    Id = u.Id,
                    Name = string.IsNullOrWhiteSpace(u.FullName) ? (u.Email ?? u.UserName ?? u.Id) : u.FullName
                })
                .SingleOrDefaultAsync(ct);

            if (item is null) return NotFound();
            return Ok(item);
        }

        /// <summary>
        /// Returns detailed client information with optional search and pagination.
        /// </summary>
        [HttpGet("clients")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        [ProducesResponseType(typeof(IEnumerable<ClientDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<ClientDto>>> GetClients(
            [FromQuery] string? q,
            [FromQuery] int? take,
            CancellationToken ct)
        {
            var query = QueryUsersByRole("Client");

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                query = query.Where(u =>
                    (u.FullName != null && EF.Functions.Like(u.FullName, $"%{term}%")) ||
                    (u.UserName != null && EF.Functions.Like(u.UserName, $"%{term}%")) ||
                    (u.Email != null && EF.Functions.Like(u.Email, $"%{term}%")));
            }

            var pageSize = Math.Clamp(take ?? 100, 1, 500);

            var items = await query
                .OrderBy(u => u.FullName ?? u.Email ?? u.UserName ?? u.Id)
                .Take(pageSize)
                .Select(u => new ClientDto
                {
                    Id = u.Id,
                    Name = string.IsNullOrWhiteSpace(u.FullName) ? (u.Email ?? u.UserName ?? u.Id) : u.FullName,
                    UserName = u.UserName,
                    Email = u.Email
                })
                .ToListAsync(ct);

            return Ok(items);
        }

        // ---------------------------------------------------------------------
        // Users (Manager-only)
        // ---------------------------------------------------------------------

        /// <summary>
        /// Returns users in the current organization with their roles (Manager-only).
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Manager")]
        [ProducesResponseType(typeof(IEnumerable<UserDto>), StatusCodes.Status200OK)]
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
        /// Adds an allowed role to a user within the organization (Manager-only).
        /// </summary>
        [HttpPost("{userId}/roles/{role}")]
        [Authorize(Roles = "Manager")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
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
        /// Removes an allowed role from a user within the organization (Manager-only).
        /// Guard rails:
        /// - Cannot remove the last Manager in the organization.
        /// - Managers cannot remove their own Manager role (self-demotion).
        /// </summary>
        [HttpDelete("{userId}/roles/{role}")]
        [Authorize(Roles = "Manager")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> RemoveRole(string userId, string role, CancellationToken ct)
        {
            if (!AllowedRoles.Contains(role)) return BadRequest("Invalid role.");

            var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId && u.OrganizationId == OrganizationId, ct);
            if (user is null) return NotFound();

            if (string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase))
            {
                // Self-demotion is not allowed.
                if (userId == UserId)
                    return Forbid("Managers cannot remove their own Manager role.");

                // Prevent removal if it would leave org with zero managers.
                var managerCount = await (
                    from u in _db.Users
                    join ur in _db.UserRoles on u.Id equals ur.UserId
                    join r in _db.Roles on ur.RoleId equals r.Id
                    where u.OrganizationId == OrganizationId && r.Name == "Manager"
                    select u.Id
                ).Distinct().CountAsync(ct);

                // If target user is not currently a Manager, proceed to default behavior (won't change the count).
                var targetIsManager = await _userManager.IsInRoleAsync(user, "Manager");
                if (targetIsManager && managerCount <= 1)
                    return BadRequest("Organization must have at least one Manager.");
            }

            var result = await _userManager.RemoveFromRoleAsync(user, role);
            if (!result.Succeeded) return BadRequest(result.Errors.First().Description);

            return NoContent();
        }

        // ---------------------------------------------------------------------
        // Helpers
        // ---------------------------------------------------------------------

        /// <summary>
        /// Base query for users in the current org limited by role.
        /// </summary>
        private IQueryable<ApplicationUser> QueryUsersByRole(string roleName)
        {
            var query =
                from u in _db.Users
                join ur in _db.UserRoles on u.Id equals ur.UserId
                join r in _db.Roles on ur.RoleId equals r.Id
                where u.OrganizationId == OrganizationId && r.Name == roleName
                select u;

            return query.AsNoTracking();
        }
    }
}
