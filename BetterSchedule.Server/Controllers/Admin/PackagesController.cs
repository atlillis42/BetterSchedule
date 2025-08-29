using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Business;
using BetterSchedule.Server.Models.DTOs.Packages;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using System.Linq.Expressions;

namespace BetterSchedule.Server.Controllers.Admin
{
    /// <summary>
    /// Admin CRUD for <see cref="Package"/> templates (granted to clients via <see cref="PackageAssignment"/>).
    /// Notes:
    /// - Packages are org-scoped.
    /// - Delete is implemented as "IsActive = false" (soft off). Existing assignments remain valid.
    /// - Validation: name unique within org (case-insensitive), valid appointment type (not deleted), optional provider lock must be in org.
    /// </summary>
    [ApiController]
    [Route("api/packages")]
    [Authorize(Roles = "Manager")]
    public sealed class PackagesController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;

        public PackagesController(ApplicationDbContext db) => _db = db;

        /// <summary>
        /// List packages in the organization.
        /// Filters:
        /// - <paramref name="activeOnly"/>: only packages with IsActive = true.
        /// - <paramref name="appointmentTypeId"/>: limit to a specific appointment type.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PackageDto>>> List(
            [FromQuery] bool activeOnly = false,
            [FromQuery] int? appointmentTypeId = null,
            CancellationToken ct = default)
        {
            var q = _db.Packages.AsNoTracking()
                .Where(p => p.OrganizationId == OrganizationId);

            if (activeOnly)
                q = q.Where(p => p.IsActive);

            if (appointmentTypeId.HasValue)
                q = q.Where(p => p.AppointmentTypeId == appointmentTypeId.Value);

            var list = await q
                .OrderByDescending(p => p.IsActive)
                .ThenBy(p => p.Name)
                .Select(ToDto())
                .ToListAsync(ct);

            return Ok(list);
        }

        /// <summary>Get a single package by id (org-scoped).</summary>
        [HttpGet("{id:int}")]
        public async Task<ActionResult<PackageDto>> GetById([FromRoute] int id, CancellationToken ct = default)
        {
            var dto = await _db.Packages.AsNoTracking()
                .Where(p => p.OrganizationId == OrganizationId && p.Id == id)
                .Select(ToDto())
                .FirstOrDefaultAsync(ct);

            return dto is null ? NotFound() : Ok(dto);
        }

        /// <summary>
        /// Create a new package.
        /// Validation:
        /// - Name non-empty and unique within org (case-insensitive).
        /// - Appointment type exists in org and is not soft-deleted.
        /// - If <c>ProviderLocked</c> = true, <c>ProviderId</c> must be a user in the org.
        /// - <c>ExpiresAfterDays</c> (if set) must be 1..36500.
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<PackageDto>> Create([FromBody] CreatePackageDto dto, CancellationToken ct = default)
        {
            var name = (dto.Name ?? "").Trim();
            if (string.IsNullOrWhiteSpace(name)) return BadRequest("Name is required.");
            if (dto.TotalUses <= 0) return BadRequest("TotalUses must be greater than 0.");

            if (dto.ExpiresAfterDays is int ead && (ead < 1 || ead > 36500))
                return BadRequest("ExpiresAfterDays must be between 1 and 36500.");

            // Case-insensitive uniqueness check (matches DB collation set on the column)
            var normalized = name.ToUpperInvariant();
            var nameExists = await _db.Packages
                .AnyAsync(p => p.OrganizationId == OrganizationId && p.Name.ToUpper() == normalized, ct);
            if (nameExists)
                return Conflict("A package with this name already exists in this organization.");

            // Appointment type must exist and not be soft-deleted
            var typeExists = await _db.AppointmentTypes
                .AnyAsync(a => a.OrganizationId == OrganizationId && a.Id == dto.AppointmentTypeId && !a.IsDeleted, ct);
            if (!typeExists) return BadRequest("Appointment type not found.");

            // Optional provider lock
            string? providerId = null;
            if (dto.ProviderLocked)
            {
                if (string.IsNullOrWhiteSpace(dto.ProviderId))
                    return BadRequest("ProviderId is required when ProviderLocked=true.");

                var providerExists = await _db.Users
                    .AnyAsync(u => u.OrganizationId == OrganizationId && u.Id == dto.ProviderId, ct);
                if (!providerExists) return BadRequest("Provider not found in this organization.");
                providerId = dto.ProviderId;
            }

            var entity = new Package
            {
                OrganizationId = OrganizationId,
                Name = name,
                AppointmentTypeId = dto.AppointmentTypeId,
                TotalUses = dto.TotalUses,
                ProviderLocked = dto.ProviderLocked,
                ProviderId = dto.ProviderLocked ? providerId : null,
                ExpiresAfterDays = dto.ExpiresAfterDays,
                IsActive = dto.IsActive ?? true,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _db.Packages.Add(entity);

            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                return Conflict("A package with this name already exists in this organization.");
            }

            var read = await _db.Packages.AsNoTracking()
                .Where(p => p.Id == entity.Id)
                .Select(ToDto())
                .FirstAsync(ct);

            return CreatedAtAction(nameof(GetById), new { id = read.Id }, read);
        }

        /// <summary>
        /// Update an existing package (patch semantics via nullable fields).
        /// Mirrors create validation for fields being changed.
        /// </summary>
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdatePackageDto dto, CancellationToken ct = default)
        {
            var entity = await _db.Packages
                .FirstOrDefaultAsync(p => p.OrganizationId == OrganizationId && p.Id == id, ct);
            if (entity is null) return NotFound();

            // Name
            if (dto.Name is string n)
            {
                var name = n.Trim();
                if (string.IsNullOrWhiteSpace(name)) return BadRequest("Name cannot be empty.");
                var normalized = name.ToUpperInvariant();
                var nameExists = await _db.Packages
                    .AnyAsync(p => p.OrganizationId == OrganizationId && p.Id != id && p.Name.ToUpper() == normalized, ct);
                if (nameExists)
                    return Conflict("A different package with this name already exists in this organization.");
                entity.Name = name;
            }

            // Type
            if (dto.AppointmentTypeId.HasValue)
            {
                var typeExists = await _db.AppointmentTypes
                    .AnyAsync(a => a.OrganizationId == OrganizationId && a.Id == dto.AppointmentTypeId.Value && !a.IsDeleted, ct);
                if (!typeExists) return BadRequest("Appointment type not found.");
                entity.AppointmentTypeId = dto.AppointmentTypeId.Value;
            }

            // Total uses
            if (dto.TotalUses.HasValue)
            {
                if (dto.TotalUses.Value <= 0) return BadRequest("TotalUses must be greater than 0.");
                entity.TotalUses = dto.TotalUses.Value;
            }

            // Provider lock
            if (dto.ProviderLocked.HasValue)
            {
                if (dto.ProviderLocked.Value)
                {
                    var providerId = dto.ProviderId ?? entity.ProviderId;
                    if (string.IsNullOrWhiteSpace(providerId))
                        return BadRequest("ProviderId is required when ProviderLocked=true.");

                    var providerExists = await _db.Users
                        .AnyAsync(u => u.OrganizationId == OrganizationId && u.Id == providerId, ct);
                    if (!providerExists) return BadRequest("Provider not found in this organization.");

                    entity.ProviderLocked = true;
                    entity.ProviderId = providerId;
                }
                else
                {
                    entity.ProviderLocked = false;
                    entity.ProviderId = null;
                }
            }
            else if (dto.ProviderId is not null)
            {
                if (!entity.ProviderLocked) return BadRequest("Cannot set ProviderId when ProviderLocked=false.");
                var providerExists = await _db.Users
                    .AnyAsync(u => u.OrganizationId == OrganizationId && u.Id == dto.ProviderId, ct);
                if (!providerExists) return BadRequest("Provider not found in this organization.");
                entity.ProviderId = dto.ProviderId;
            }

            // Expiry
            if (dto.ExpiresAfterDays.HasValue)
            {
                var ead = dto.ExpiresAfterDays.Value;
                if (ead < 1 || ead > 36500)
                    return BadRequest("ExpiresAfterDays must be between 1 and 36500.");
                entity.ExpiresAfterDays = ead;
            }

            // Active flag
            if (dto.IsActive.HasValue)
            {
                entity.IsActive = dto.IsActive.Value;
            }

            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                return Conflict("A package with this name already exists in this organization.");
            }

            return NoContent();
        }

        /// <summary>
        /// Soft-remove a package (sets <c>IsActive=false</c>).
        /// Existing assignments continue to work until they expire or run out.
        /// </summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct = default)
        {
            var entity = await _db.Packages
                .FirstOrDefaultAsync(p => p.OrganizationId == OrganizationId && p.Id == id, ct);
            if (entity is null) return NotFound();

            entity.IsActive = false;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        /// <summary>Projection from <see cref="Package"/> to <see cref="PackageDto"/>.</summary>
        private static Expression<Func<Package, PackageDto>> ToDto() => p => new PackageDto
        {
            Id = p.Id,
            OrganizationId = p.OrganizationId,
            Name = p.Name,
            AppointmentTypeId = p.AppointmentTypeId,
            TotalUses = p.TotalUses,
            ProviderLocked = p.ProviderLocked,
            ProviderId = p.ProviderLocked ? p.ProviderId : null,
            ExpiresAfterDays = p.ExpiresAfterDays,
            IsActive = p.IsActive,
            CreatedAt = p.CreatedAt
        };

        private static bool IsUniqueViolation(DbUpdateException ex)
            => ex.InnerException is SqlException sql && (sql.Number == 2601 || sql.Number == 2627);
    }
}
