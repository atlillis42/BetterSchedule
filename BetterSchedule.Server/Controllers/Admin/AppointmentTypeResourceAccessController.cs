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
    /// Manage which <see cref="Models.Scheduling.CalendarResource"/>s an
    /// <see cref="Models.Scheduling.AppointmentType"/> may use within the organization.
    /// Links are soft-deletable for safe unassign.
    /// </summary>
    [ApiController]
    [Route("api/appointment-type-resource-access")]
    [Authorize(Roles = "Manager")]
    public sealed class AppointmentTypeResourceAccessController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        public AppointmentTypeResourceAccessController(ApplicationDbContext db) => _db = db;

        /// <summary>
        /// Get permitted resource IDs for the specified appointment type (org-scoped).
        /// Excludes deleted links and deleted resources.
        /// </summary>
        [HttpGet("by-type/{appointmentTypeId:int}")]
        public async Task<ActionResult<IEnumerable<int>>> ByType([FromRoute] int appointmentTypeId, CancellationToken ct)
        {
            var ids = await _db.AppointmentTypeResourceAccesses
                .Where(x => x.OrganizationId == OrganizationId && x.AppointmentTypeId == appointmentTypeId && !x.IsDeleted)
                .Join(_db.CalendarResources.Where(r => r.OrganizationId == OrganizationId && !r.IsDeleted),
                      l => l.ResourceId, r => r.Id, (l, r) => r.Id)
                .ToListAsync(ct);

            return Ok(ids);
        }

        /// <summary>Assigns a resource to an appointment type within the org (idempotent).</summary>
        public sealed record AssignDto(
            [property: Required] int AppointmentTypeId,
            [property: Required] int ResourceId
        );

        /// <summary>
        /// Create (or undelete) a link that allows the appointment type to use the resource.
        /// 404 if either target does not exist in the org or is soft-deleted.
        /// </summary>
        [HttpPost("assign")]
        public async Task<IActionResult> Assign([FromBody] AssignDto dto, CancellationToken ct)
        {
            var typeExists = await _db.AppointmentTypes.AnyAsync(a =>
                a.OrganizationId == OrganizationId && a.Id == dto.AppointmentTypeId && !a.IsDeleted, ct);
            var resourceExists = await _db.CalendarResources.AnyAsync(r =>
                r.OrganizationId == OrganizationId && r.Id == dto.ResourceId && !r.IsDeleted, ct);
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

            try
            {
                await _db.SaveChangesAsync(ct);
                return NoContent();
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                // Another request created the same active link concurrently — treat as idempotent success.
                return NoContent();
            }
        }

        /// <summary>
        /// Soft-unassign a resource from an appointment type (sets link IsDeleted=true).
        /// 404 if no active link is found.
        /// </summary>
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

        private static bool IsUniqueViolation(DbUpdateException ex)
            => ex.InnerException is SqlException sql && (sql.Number == 2601 || sql.Number == 2627);
    }
}
