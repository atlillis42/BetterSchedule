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
    /// - List eligible assignments for a booking context
    /// - Grant a package to a client
    /// - List assignments by client
    /// 
    /// NOTE: Uses lean PackageAssignment model; enriches via join to Package.
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
        /// </summary>
        [HttpGet("eligible")]
        public async Task<ActionResult<IEnumerable<PackageAssignmentDto>>> Eligible(
            [FromQuery] string clientId,
            [FromQuery] int appointmentTypeId,
            [FromQuery] string? providerId,
            CancellationToken ct)
        {
            var now = DateTimeOffset.UtcNow;

            var query =
                from a in _db.PackageAssignments.AsNoTracking()
                join p in _db.Packages.AsNoTracking() on a.PackageId equals p.Id
                where a.OrganizationId == OrganizationId
                      && p.OrganizationId == OrganizationId
                      && !a.IsDeleted
                      && p.IsActive
                      && a.ClientId == clientId
                      && p.AppointmentTypeId == appointmentTypeId
                      && (!a.ExpiresAtUtc.HasValue || a.ExpiresAtUtc.Value >= now)
                      && a.RemainingUses > 0
                select new { a, p };

            if (!string.IsNullOrWhiteSpace(providerId))
            {
                query = query.Where(x => !x.p.ProviderLocked || (x.p.ProviderLocked && x.p.ProviderId == providerId));
            }

            var list = await query
                .OrderByDescending(x => x.a.RemainingUses)
                .ThenBy(x => x.a.ExpiresAtUtc ?? DateTimeOffset.MaxValue)
                .Select(x => new PackageAssignmentDto
                {
                    Id = x.a.Id,
                    OrganizationId = x.a.OrganizationId,
                    ClientId = x.a.ClientId,
                    PackageId = x.a.PackageId,
                    RemainingUses = x.a.RemainingUses,
                    GrantedAt = x.a.GrantedAt,
                    ExpiresAtUtc = x.a.ExpiresAtUtc,
                    IsDeleted = x.a.IsDeleted,

                    // enrich from Package
                    PackageName = x.p.Name,
                    AppointmentTypeId = x.p.AppointmentTypeId,
                    TotalUses = x.p.TotalUses,
                    ProviderLocked = x.p.ProviderLocked,
                    ProviderId = x.p.ProviderId
                })
                .ToListAsync(ct);

            return Ok(list);
        }

        /// <summary>Lists all assignments for a given client (enriched with package details).</summary>
        [HttpGet("by-client/{clientId}")]
        public async Task<ActionResult<IEnumerable<PackageAssignmentDto>>> ByClient([FromRoute] string clientId, CancellationToken ct)
        {
            var list = await (
                    from a in _db.PackageAssignments.AsNoTracking()
                    join p in _db.Packages.AsNoTracking() on a.PackageId equals p.Id
                    where a.OrganizationId == OrganizationId
                          && p.OrganizationId == OrganizationId
                          && !a.IsDeleted
                          && a.ClientId == clientId
                    orderby a.GrantedAt descending
                    select new PackageAssignmentDto
                    {
                        Id = a.Id,
                        OrganizationId = a.OrganizationId,
                        ClientId = a.ClientId,
                        PackageId = a.PackageId,
                        RemainingUses = a.RemainingUses,
                        GrantedAt = a.GrantedAt,
                        ExpiresAtUtc = a.ExpiresAtUtc,
                        IsDeleted = a.IsDeleted,

                        PackageName = p.Name,
                        AppointmentTypeId = p.AppointmentTypeId,
                        TotalUses = p.TotalUses,
                        ProviderLocked = p.ProviderLocked,
                        ProviderId = p.ProviderId
                    })
                .ToListAsync(ct);

            return Ok(list);
        }

        /// <summary>
        /// Grants a package to a client (sets RemainingUses from package.TotalUses and computes ExpiresAtUtc using ExpiresAfterDays).
        /// </summary>
        [HttpPost("grant")]
        public async Task<ActionResult<PackageAssignmentDto>> Grant([FromBody] GrantPackageDto dto, CancellationToken ct)
        {
            var p = await _db.Packages
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == dto.PackageId && x.OrganizationId == OrganizationId && x.IsActive, ct);

            if (p is null) return BadRequest("Package not found.");

            var now = DateTimeOffset.UtcNow;
            DateTimeOffset? expires = null;
            if (p.ExpiresAfterDays.HasValue && p.ExpiresAfterDays.Value > 0)
                expires = now.AddDays(p.ExpiresAfterDays.Value);

            var assignment = new PackageAssignment
            {
                OrganizationId = OrganizationId,
                ClientId = dto.ClientId,
                PackageId = p.Id,

                RemainingUses = p.TotalUses,
                GrantedAt = now,
                ExpiresAtUtc = expires,
                IsDeleted = false
            };

            _db.PackageAssignments.Add(assignment);
            await _db.SaveChangesAsync(ct);

            var read = await (
                    from a in _db.PackageAssignments.AsNoTracking()
                    join pkg in _db.Packages.AsNoTracking() on a.PackageId equals pkg.Id
                    where a.Id == assignment.Id
                    select new PackageAssignmentDto
                    {
                        Id = a.Id,
                        OrganizationId = a.OrganizationId,
                        ClientId = a.ClientId,
                        PackageId = a.PackageId,
                        RemainingUses = a.RemainingUses,
                        GrantedAt = a.GrantedAt,
                        ExpiresAtUtc = a.ExpiresAtUtc,
                        IsDeleted = a.IsDeleted,

                        PackageName = pkg.Name,
                        AppointmentTypeId = pkg.AppointmentTypeId,
                        TotalUses = pkg.TotalUses,
                        ProviderLocked = pkg.ProviderLocked,
                        ProviderId = pkg.ProviderId
                    })
                .FirstAsync(ct);

            return CreatedAtAction(nameof(ByClient), new { clientId = dto.ClientId }, read);
        }
    }
}
