using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Access;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Models.Tenant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Controllers.Admin
{
    [ApiController]
    [Route("api/provider-resource-access")]
    [Authorize(Roles = "Manager")]
    public sealed class ProviderResourceAccessController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        public ProviderResourceAccessController(ApplicationDbContext db) => _db = db;

        // GET /api/provider-resource-access/by-provider/{userId}
        [HttpGet("by-provider/{userId}")]
        public async Task<ActionResult<IEnumerable<int>>> ByProvider([FromRoute] string userId, CancellationToken ct)
        {
            var ids = await _db.ProviderResourceAccesses
                .Where(x => x.OrganizationId == OrganizationId && x.UserId == userId && !x.IsDeleted)
                .Select(x => x.ResourceId)
                .ToListAsync(ct);

            return Ok(ids);
        }

        public sealed record AssignDto(string UserId, int ResourceId);

        // POST /api/provider-resource-access/assign
        [HttpPost("assign")]
        public async Task<IActionResult> Assign([FromBody] AssignDto dto, CancellationToken ct)
        {
            // Validate targets exist in org
            var resourceExists = await _db.CalendarResources.AnyAsync(r => r.OrganizationId == OrganizationId && r.Id == dto.ResourceId && !r.IsDeleted, ct);
            var userExists = await _db.Users.AnyAsync(u => u.OrganizationId == OrganizationId && u.Id == dto.UserId, ct);
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

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // POST /api/provider-resource-access/unassign
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
    }
}
