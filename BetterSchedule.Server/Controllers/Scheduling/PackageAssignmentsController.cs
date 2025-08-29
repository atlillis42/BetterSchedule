using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Business;
using BetterSchedule.Server.Models.DTOs.Packages;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    /// <summary>
    /// Manage and query client package assignments.
    /// Responsibilities:
    /// - List eligible assignments for a booking context
    /// - Grant a package to a client
    /// - List assignments by client
    ///
    /// Notes:
    /// - Uses <see cref="PackageAssignment"/> snapshot fields as the source of truth for reads.
    /// - Existing assignments remain valid even if the underlying Package becomes inactive.
    /// </summary>
    [ApiController]
    [Route("api/package-assignments")]
    [Authorize(Roles = "Manager,ServiceProvider")]
    public sealed class PackageAssignmentsController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;

        public PackageAssignmentsController(ApplicationDbContext db) => _db = db;

        /// <summary>
        /// Lists a client's assignments that are eligible for a given appointment type (and optional provider).
        /// Uses snapshot fields; does not require current package to be active.
        /// </summary>
        [HttpGet("eligible")]
        [ProducesResponseType(typeof(IEnumerable<PackageAssignmentDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<PackageAssignmentDto>>> Eligible(
            [FromQuery] string clientId,
            [FromQuery] int appointmentTypeId,
            [FromQuery] string? providerId,
            CancellationToken ct)
        {
            var now = DateTimeOffset.UtcNow;

            var q = _db.PackageAssignments.AsNoTracking().Where(a =>
                a.OrganizationId == OrganizationId &&
                !a.IsDeleted &&
                a.ClientId == clientId &&
                a.AppointmentTypeId == appointmentTypeId &&
                (a.ExpiresAtUtc == null || a.ExpiresAtUtc.Value >= now) &&
                a.RemainingUses > 0
            );

            if (!string.IsNullOrWhiteSpace(providerId))
            {
                q = q.Where(a => !a.ProviderLocked || a.ProviderId == providerId);
            }

            var list = await q
                .OrderByDescending(a => a.RemainingUses)
                .ThenBy(a => a.ExpiresAtUtc ?? DateTimeOffset.MaxValue)
                .Select(a => new PackageAssignmentDto
                {
                    Id = a.Id,
                    OrganizationId = a.OrganizationId,
                    ClientId = a.ClientId,
                    PackageId = a.PackageId,
                    RemainingUses = a.RemainingUses,
                    GrantedAt = a.GrantedAt,
                    ExpiresAtUtc = a.ExpiresAtUtc,
                    IsDeleted = a.IsDeleted,

                    // Snapshot fields
                    PackageName = a.PackageName,
                    AppointmentTypeId = a.AppointmentTypeId,
                    TotalUses = a.TotalUses,
                    ProviderLocked = a.ProviderLocked,
                    ProviderId = a.ProviderId
                })
                .ToListAsync(ct);

            return Ok(list);
        }

        /// <summary>
        /// Lists all non-deleted assignments for a given client (with snapshot details).
        /// </summary>
        [HttpGet("by-client/{clientId}")]
        [ProducesResponseType(typeof(IEnumerable<PackageAssignmentDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<PackageAssignmentDto>>> ByClient([FromRoute] string clientId, CancellationToken ct)
        {
            var list = await _db.PackageAssignments.AsNoTracking()
                .Where(a => a.OrganizationId == OrganizationId && !a.IsDeleted && a.ClientId == clientId)
                .OrderByDescending(a => a.GrantedAt)
                .Select(a => new PackageAssignmentDto
                {
                    Id = a.Id,
                    OrganizationId = a.OrganizationId,
                    ClientId = a.ClientId,
                    PackageId = a.PackageId,
                    RemainingUses = a.RemainingUses,
                    GrantedAt = a.GrantedAt,
                    ExpiresAtUtc = a.ExpiresAtUtc,
                    IsDeleted = a.IsDeleted,

                    // Snapshot fields
                    PackageName = a.PackageName,
                    AppointmentTypeId = a.AppointmentTypeId,
                    TotalUses = a.TotalUses,
                    ProviderLocked = a.ProviderLocked,
                    ProviderId = a.ProviderId
                })
                .ToListAsync(ct);

            return Ok(list);
        }

        /// <summary>
        /// Grants a package to a client.
        /// Sets RemainingUses from Package.TotalUses and computes ExpiresAtUtc from Package.ExpiresAfterDays.
        /// Also snapshots package fields onto the assignment for future-proof reads.
        /// </summary>
        [HttpPost("grant")]
        [ProducesResponseType(typeof(PackageAssignmentDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<PackageAssignmentDto>> Grant([FromBody] GrantPackageDto dto, CancellationToken ct)
        {
            // Validate client exists in org
            var clientExists = await _db.Users.AnyAsync(u => u.Id == dto.ClientId && u.OrganizationId == OrganizationId, ct);
            if (!clientExists) return BadRequest("Client not found in this organization.");

            var p = await _db.Packages
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == dto.PackageId && x.OrganizationId == OrganizationId, ct);

            if (p is null) return BadRequest("Package not found.");
            if (p.TotalUses <= 0) return BadRequest("Package has invalid TotalUses.");

            var now = DateTimeOffset.UtcNow;
            DateTimeOffset? expires = null;
            if (p.ExpiresAfterDays.HasValue && p.ExpiresAfterDays.Value > 0)
                expires = now.AddDays(p.ExpiresAfterDays.Value);

            var assignment = new PackageAssignment
            {
                OrganizationId = OrganizationId,
                ClientId = dto.ClientId,
                PackageId = p.Id,

                // Snapshots from Package
                PackageName = p.Name,
                AppointmentTypeId = p.AppointmentTypeId,
                TotalUses = p.TotalUses,
                RemainingUses = p.TotalUses,
                ProviderLocked = p.ProviderLocked,
                ProviderId = p.ProviderLocked ? p.ProviderId : null,

                GrantedAt = now,
                ExpiresAtUtc = expires,
                IsDeleted = false
            };

            _db.PackageAssignments.Add(assignment);
            await _db.SaveChangesAsync(ct);

            var read = new PackageAssignmentDto
            {
                Id = assignment.Id,
                OrganizationId = assignment.OrganizationId,
                ClientId = assignment.ClientId,
                PackageId = assignment.PackageId,
                RemainingUses = assignment.RemainingUses,
                GrantedAt = assignment.GrantedAt,
                ExpiresAtUtc = assignment.ExpiresAtUtc,
                IsDeleted = assignment.IsDeleted,

                PackageName = assignment.PackageName,
                AppointmentTypeId = assignment.AppointmentTypeId,
                TotalUses = assignment.TotalUses,
                ProviderLocked = assignment.ProviderLocked,
                ProviderId = assignment.ProviderId
            };

            return CreatedAtAction(nameof(ByClient), new { clientId = dto.ClientId }, read);
        }
    }
}
