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
    /// Manage which <see cref="Models.Scheduling.AppointmentType"/>s a provider
    /// (<see cref="Models.Identity.ApplicationUser"/>) may perform within the org.
    /// Links are soft-deletable for safe unassign.
    /// </summary>
    [ApiController]
    [Route("api/provider-appointment-type-access")]
    [Authorize(Roles = "Manager")]
    public sealed class ProviderAppointmentTypeAccessController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        public ProviderAppointmentTypeAccessController(ApplicationDbContext db) => _db = db;

        /// <summary>
        /// Get permitted appointment type IDs for a provider (org-scoped).
        /// Excludes deleted links and deleted appointment types.
        /// </summary>
        [HttpGet("by-provider/{userId}")]
        public async Task<ActionResult<IEnumerable<int>>> ByProvider([FromRoute] string userId, CancellationToken ct)
        {
            var ids = await _db.ProviderAppointmentTypeAccesses
                .Where(x => x.OrganizationId == OrganizationId && x.UserId == userId && !x.IsDeleted)
                .Join(_db.AppointmentTypes.Where(a => a.OrganizationId == OrganizationId && !a.IsDeleted),
                      l => l.AppointmentTypeId, a => a.Id, (l, a) => a.Id)
                .ToListAsync(ct);

            return Ok(ids);
        }

        /// <summary>Assigns an appointment type to a provider (idempotent).</summary>
        public sealed record AssignDto(
            [property: Required] string UserId,
            [property: Required] int AppointmentTypeId
        );

        /// <summary>
        /// Create (or undelete) a link allowing the provider to perform the appointment type.
        /// 404 if either target does not exist in the org (type must not be soft-deleted).
        /// </summary>
        [HttpPost("assign")]
        public async Task<IActionResult> Assign([FromBody] AssignDto dto, CancellationToken ct)
        {
            var typeExists = await _db.AppointmentTypes.AnyAsync(a =>
                a.OrganizationId == OrganizationId && a.Id == dto.AppointmentTypeId && !a.IsDeleted, ct);
            var userExists = await _db.Users.AnyAsync(u =>
                u.OrganizationId == OrganizationId && u.Id == dto.UserId, ct);
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
        /// Soft-unassign an appointment type from a provider (sets link IsDeleted=true).
        /// 404 if no active link is found.
        /// </summary>
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

        private static bool IsUniqueViolation(DbUpdateException ex)
            => ex.InnerException is SqlException sql && (sql.Number == 2601 || sql.Number == 2627);
    }
}
