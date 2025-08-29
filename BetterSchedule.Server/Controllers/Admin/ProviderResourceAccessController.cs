using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Access;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using System.ComponentModel.DataAnnotations;

namespace BetterSchedule.Server.Controllers.Admin
{
    /// <summary>
    /// Manage which <see cref="Models.Scheduling.CalendarResource"/>s a provider
    /// (<see cref="Models.Identity.ApplicationUser"/>) may use within the org.
    /// Links are soft-deletable for safe unassign.
    /// </summary>
    [ApiController]
    [Route("api/provider-resource-access")]
    [Authorize(Roles = "Manager")]
    public sealed class ProviderResourceAccessController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        public ProviderResourceAccessController(ApplicationDbContext db) => _db = db;

        /// <summary>
        /// Get permitted resource IDs for a provider (org-scoped).
        /// Excludes deleted links and deleted resources.
        /// </summary>
        [HttpGet("by-provider/{userId}")]
        public async Task<ActionResult<IEnumerable<int>>> ByProvider([FromRoute] string userId, CancellationToken ct)
        {
            var ids = await _db.ProviderResourceAccesses
                .Where(x => x.OrganizationId == OrganizationId && x.UserId == userId && !x.IsDeleted)
                .Join(_db.CalendarResources.Where(r => r.OrganizationId == OrganizationId && !r.IsDeleted),
                      l => l.ResourceId, r => r.Id, (l, r) => r.Id)
                .ToListAsync(ct);

            return Ok(ids);
        }

        /// <summary>Assigns a resource to a provider (idempotent).</summary>
        public sealed record AssignDto(
            [property: Required] string UserId,
            [property: Required] int ResourceId
        );

        /// <summary>
        /// Create (or undelete) a link allowing the provider to use the resource.
        /// 404 if either target does not exist in the org or is soft-deleted.
        /// </summary>
        [HttpPost("assign")]
        public async Task<IActionResult> Assign([FromBody] AssignDto dto, CancellationToken ct)
        {
            var resourceExists = await _db.CalendarResources.AnyAsync(r =>
                r.OrganizationId == OrganizationId && r.Id == dto.ResourceId && !r.IsDeleted, ct);
            var userExists = await _db.Users.AnyAsync(u =>
                u.OrganizationId == OrganizationId && u.Id == dto.UserId, ct);
            if (!resourceExists || !userExists) return NotFound();

            var existing = await _db.ProviderResourceAccesses.FirstOrDefaultAsync(x =>
                x.OrganizationId == OrganizationId && x.UserId == dto.UserId && x.ResourceId == dto.ResourceId, ct);

            if (existing is null)
            {
                _db.ProviderResourceAccesses.Add(new ProviderResourceAccess
                {
                    OrganizationId = OrganizationId,
                    UserId = dto.UserId,
                    ResourceId = dto.ResourceId,
                    IsDeleted = false
                });
            }
            else if (existing.IsDeleted)
            {
                existing.IsDeleted = false;
            }

            try
            {
                await _db.SaveChangesAsync(ct);
                return NoContent();
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                return NoContent();
            }
        }

        /// <summary>
        /// Soft-unassign a resource from a provider (sets link IsDeleted=true).
        /// 404 if no active link is found.
        /// </summary>
        [HttpPost("unassign")]
        public async Task<IActionResult> Unassign([FromBody] AssignDto dto, CancellationToken ct)
        {
            var existing = await _db.ProviderResourceAccesses.FirstOrDefaultAsync(x =>
                x.OrganizationId == OrganizationId && x.UserId == dto.UserId && x.ResourceId == dto.ResourceId && !x.IsDeleted, ct);

            if (existing is null) return NotFound();

            existing.IsDeleted = true;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        private static bool IsUniqueViolation(DbUpdateException ex)
            => ex.InnerException is SqlException sql && (sql.Number == 2601 || sql.Number == 2627);
    }
}
