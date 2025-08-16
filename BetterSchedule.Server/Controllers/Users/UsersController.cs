using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.Users;
using BetterSchedule.Server.Models.Identity;
using Microsoft.AspNetCore.Authorization;
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

        /// <summary>
        /// Initializes a new instance of the <see cref="UsersController"/> class.
        /// </summary>
        /// <param name="db">Database context used to query users.</param>
        public UsersController(ApplicationDbContext db) => _db = db;

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
