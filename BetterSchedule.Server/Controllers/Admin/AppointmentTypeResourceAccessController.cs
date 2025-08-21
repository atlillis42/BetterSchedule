using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Access;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Controllers.Admin
{
    [ApiController]
    [Route("api/appointment-type-resource-access")]
    [Authorize(Roles = "Manager")]
    public sealed class AppointmentTypeResourceAccessController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        public AppointmentTypeResourceAccessController(ApplicationDbContext db) => _db = db;

        // GET /api/appointment-type-resource-access/by-type/{appointmentTypeId}
        [HttpGet("by-type/{appointmentTypeId:int}")]
        public async Task<ActionResult<IEnumerable<int>>> ByType([FromRoute] int appointmentTypeId, CancellationToken ct)
        {
            var ids = await _db.AppointmentTypeResourceAccesses
                .Where(x => x.OrganizationId == OrganizationId && x.AppointmentTypeId == appointmentTypeId && !x.IsDeleted)
                .Select(x => x.ResourceId)
                .ToListAsync(ct);

            return Ok(ids);
        }

        public sealed record AssignDto(int AppointmentTypeId, int ResourceId);

        // POST /api/appointment-type-resource-access/assign
        [HttpPost("assign")]
        public async Task<IActionResult> Assign([FromBody] AssignDto dto, CancellationToken ct)
        {
            var typeExists = await _db.AppointmentTypes.AnyAsync(a => a.OrganizationId == OrganizationId && a.Id == dto.AppointmentTypeId && !a.IsDeleted, ct);
            var resourceExists = await _db.CalendarResources.AnyAsync(r => r.OrganizationId == OrganizationId && r.Id == dto.ResourceId && !r.IsDeleted, ct);
            if (!typeExists || !resourceExists) return NotFound();

            var existing = await _db.AppointmentTypeResourceAccesses.FirstOrDefaultAsync(x =>
                x.OrganizationId == OrganizationId && x.AppointmentTypeId == dto.AppointmentTypeId && x.ResourceId == dto.ResourceId, ct);

            if (existing is null)
            {
                _db.AppointmentTypeResourceAccesses.Add(new AppointmentTypeResourceAccess
                {
                    OrganizationId = OrganizationId,
                    AppointmentTypeId = dto.AppointmentTypeId,
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

        // POST /api/appointment-type-resource-access/unassign
        [HttpPost("unassign")]
        public async Task<IActionResult> Unassign([FromBody] AssignDto dto, CancellationToken ct)
        {
            var existing = await _db.AppointmentTypeResourceAccesses.FirstOrDefaultAsync(x =>
                x.OrganizationId == OrganizationId && x.AppointmentTypeId == dto.AppointmentTypeId && x.ResourceId == dto.ResourceId && !x.IsDeleted, ct);

            if (existing is null) return NotFound();

            existing.IsDeleted = true;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }
    }
}
