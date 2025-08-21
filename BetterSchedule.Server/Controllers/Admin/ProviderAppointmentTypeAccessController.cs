using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Access;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Controllers.Admin
{
    [ApiController]
    [Route("api/provider-appointment-type-access")]
    [Authorize(Roles = "Manager")]
    public sealed class ProviderAppointmentTypeAccessController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        public ProviderAppointmentTypeAccessController(ApplicationDbContext db) => _db = db;

        // GET /api/provider-appointment-type-access/by-provider/{userId}
        [HttpGet("by-provider/{userId}")]
        public async Task<ActionResult<IEnumerable<int>>> ByProvider([FromRoute] string userId, CancellationToken ct)
        {
            var ids = await _db.ProviderAppointmentTypeAccesses
                .Where(x => x.OrganizationId == OrganizationId && x.UserId == userId && !x.IsDeleted)
                .Select(x => x.AppointmentTypeId)
                .ToListAsync(ct);

            return Ok(ids);
        }

        public sealed record AssignDto(string UserId, int AppointmentTypeId);

        // POST /api/provider-appointment-type-access/assign
        [HttpPost("assign")]
        public async Task<IActionResult> Assign([FromBody] AssignDto dto, CancellationToken ct)
        {
            var typeExists = await _db.AppointmentTypes.AnyAsync(a => a.OrganizationId == OrganizationId && a.Id == dto.AppointmentTypeId && !a.IsDeleted, ct);
            var userExists = await _db.Users.AnyAsync(u => u.OrganizationId == OrganizationId && u.Id == dto.UserId, ct);
            if (!typeExists || !userExists) return NotFound();

            var existing = await _db.ProviderAppointmentTypeAccesses.FirstOrDefaultAsync(x =>
                x.OrganizationId == OrganizationId && x.UserId == dto.UserId && x.AppointmentTypeId == dto.AppointmentTypeId, ct);

            if (existing is null)
            {
                _db.ProviderAppointmentTypeAccesses.Add(new ProviderAppointmentTypeAccess
                {
                    OrganizationId = OrganizationId,
                    UserId = dto.UserId,
                    AppointmentTypeId = dto.AppointmentTypeId,
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

        // POST /api/provider-appointment-type-access/unassign
        [HttpPost("unassign")]
        public async Task<IActionResult> Unassign([FromBody] AssignDto dto, CancellationToken ct)
        {
            var existing = await _db.ProviderAppointmentTypeAccesses.FirstOrDefaultAsync(x =>
                x.OrganizationId == OrganizationId && x.UserId == dto.UserId && x.AppointmentTypeId == dto.AppointmentTypeId && !x.IsDeleted, ct);

            if (existing is null) return NotFound();

            existing.IsDeleted = true;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }
    }
}
