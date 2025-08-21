using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.ProviderAvailability;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Models.Tenant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    [ApiController]
    [Route("api/provider-availability")]
    [Authorize]
    public sealed class ProviderAvailabilityController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        public ProviderAvailabilityController(ApplicationDbContext db) => _db = db;

        // GET /api/provider-availability?providerId=abc
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProviderAvailabilityDto>>> List(
            [FromQuery] string? providerId,
            CancellationToken ct)
        {
            var query = _db.ProviderAvailabilities
                .VisibleTo(OrganizationId, UserId, IsManager, IsProvider, IsClient);

            if (!string.IsNullOrWhiteSpace(providerId))
            {                
                query = query.Where(a => a.ServiceProviderId == providerId);
            }

            var items = await query
                .OrderBy(a => a.ServiceProviderId)
                .ThenBy(a => a.DayOfWeek)
                .ThenBy(a => a.StartLocalTime)
                .Select(ToDto())
                .ToListAsync(ct);

            return Ok(items);
        }

        // GET /api/provider-availability/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<ProviderAvailabilityDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var dto = await _db.ProviderAvailabilities
                .VisibleTo(OrganizationId, UserId, IsManager, IsProvider, IsClient)
                .Where(a => a.Id == id)
                .Select(ToDto())
                .FirstOrDefaultAsync(ct);

            return dto is null ? NotFound() : Ok(dto);
        }

        // POST /api/provider-availability/providers/{providerId}/ensure-default
        /// <summary>
        /// If the provider has no availability, create Mon–Fri using org business hours.
        /// Uses OrganizationSettings.BusinessHoursStartLocal/EndLocal; falls back to 09:00–17:00.
        /// </summary>
        [HttpPost("providers/{providerId}/ensure-default")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> EnsureDefaultForProvider([FromRoute] string providerId, CancellationToken ct)
        {
            // Providers may only seed their own defaults (managers can seed any)
            if (IsProvider && !IsManager && providerId != UserId)
                return Forbid();

            var hasAny = await _db.ProviderAvailabilities
                .AnyAsync(a => a.OrganizationId == OrganizationId && a.ServiceProviderId == providerId && !a.IsDeleted, ct);

            if (hasAny) return Ok(new { created = false, count = 0 });

            var s = await _db.OrganizationSettings.FirstOrDefaultAsync(x => x.OrganizationId == OrganizationId, ct);

            var start = s?.BusinessHoursStartLocal ?? new TimeSpan(9, 0, 0);
            var end = s?.BusinessHoursEndLocal ?? new TimeSpan(17, 0, 0);

            var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
            var far = new DateOnly(2099, 12, 31);

            var days = new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday };

            foreach (var dow in days)
            {
                _db.ProviderAvailabilities.Add(new ProviderAvailability
                {
                    OrganizationId = OrganizationId,
                    ServiceProviderId = providerId,
                    DayOfWeek = dow,
                    StartLocalTime = start,
                    EndLocalTime = end,
                    EffectiveFrom = today,
                    EffectiveTo = far,
                    IsDeleted = false
                });
            }

            var count = await _db.SaveChangesAsync(ct);
            return Ok(new { created = true, count });
        }

        // POST /api/provider-availability
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<ActionResult<ProviderAvailabilityDto>> Create(
            [FromBody] CreateProviderAvailabilityDto dto,
            CancellationToken ct)
        {
            // Providers may only create for themselves
            if (IsProvider && !IsManager && dto.ServiceProviderId != UserId)
                return Forbid();

            var (ok, error) = await ValidateAvailabilityAsync(
                dto.ServiceProviderId, dto.DayOfWeek,
                dto.StartLocalTime, dto.EndLocalTime,
                dto.EffectiveFrom, dto.EffectiveTo,
                ignoreId: null, ct);

            if (!ok) return BadRequest(error);

            var entity = new ProviderAvailability
            {
                OrganizationId = OrganizationId,
                ServiceProviderId = dto.ServiceProviderId,
                DayOfWeek = dto.DayOfWeek,
                StartLocalTime = dto.StartLocalTime,
                EndLocalTime = dto.EndLocalTime,
                EffectiveFrom = dto.EffectiveFrom,
                EffectiveTo = dto.EffectiveTo,
                IsDeleted = false
            };

            _db.ProviderAvailabilities.Add(entity);
            await _db.SaveChangesAsync(ct);

            var read = await _db.ProviderAvailabilities.AsNoTracking()
                .Where(a => a.Id == entity.Id)
                .Select(ToDto())
                .FirstAsync(ct);

            return CreatedAtAction(nameof(GetById), new { id = read.Id }, read);
        }

        // PUT /api/provider-availability/{id}
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Update(
            [FromRoute] int id,
            [FromBody] UpdateProviderAvailabilityDto dto,
            CancellationToken ct)
        {
            var entity = await _db.ProviderAvailabilities
                .EditableBy(OrganizationId, UserId, IsManager, IsProvider)
                .FirstOrDefaultAsync(a => a.Id == id, ct);

            if (entity is null) return NotFound();

            var providerId = dto.ServiceProviderId ?? entity.ServiceProviderId;

            // Providers may only update their own
            if (IsProvider && !IsManager && providerId != UserId)
                return Forbid();

            var day = dto.DayOfWeek ?? entity.DayOfWeek;
            var start = dto.StartLocalTime ?? entity.StartLocalTime;
            var end = dto.EndLocalTime ?? entity.EndLocalTime;
            var from = dto.EffectiveFrom ?? entity.EffectiveFrom;
            var to = dto.EffectiveTo ?? entity.EffectiveTo;

            var (ok, error) = await ValidateAvailabilityAsync(
                providerId, day, start, end, from, to, ignoreId: id, ct);

            if (!ok) return BadRequest(error);

            entity.ServiceProviderId = providerId;
            entity.DayOfWeek = day;
            entity.StartLocalTime = start;
            entity.EndLocalTime = end;
            entity.EffectiveFrom = from;
            entity.EffectiveTo = to;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // DELETE /api/provider-availability/{id}
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
        {
            var entity = await _db.ProviderAvailabilities
                .EditableBy(OrganizationId, UserId, IsManager, IsProvider)
                .FirstOrDefaultAsync(a => a.Id == id, ct);

            if (entity is null) return NotFound();

            entity.IsDeleted = true;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // (Optional) UPSERT for grid editing
        // POST /api/provider-availability/upsert
        [HttpPost("upsert")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<ActionResult<ProviderAvailabilityDto>> Upsert(
            [FromBody] UpsertProviderAvailabilityDto dto,
            CancellationToken ct)
        {
            // Providers may only modify their own
            if (IsProvider && !IsManager && dto.ServiceProviderId != UserId)
                return Forbid();

            // If Id was provided, fall back to Update semantics
            if (dto.Id.HasValue)
            {
                var existing = await _db.ProviderAvailabilities
                    .EditableBy(OrganizationId, UserId, IsManager, IsProvider)
                    .FirstOrDefaultAsync(a => a.Id == dto.Id.Value, ct);
                if (existing is null) return NotFound();

                var (okU, errU) = await ValidateAvailabilityAsync(
                    dto.ServiceProviderId, dto.DayOfWeek,
                    dto.StartLocalTime, dto.EndLocalTime,
                    dto.EffectiveFrom, dto.EffectiveTo,
                    ignoreId: existing.Id, ct);
                if (!okU) return BadRequest(errU);

                existing.ServiceProviderId = dto.ServiceProviderId;
                existing.DayOfWeek = dto.DayOfWeek;
                existing.StartLocalTime = dto.StartLocalTime;
                existing.EndLocalTime = dto.EndLocalTime;
                existing.EffectiveFrom = dto.EffectiveFrom;
                existing.EffectiveTo = dto.EffectiveTo;
                existing.IsDeleted = false;

                await _db.SaveChangesAsync(ct);

                var updated = await _db.ProviderAvailabilities.AsNoTracking()
                    .Where(a => a.Id == existing.Id)
                    .Select(ToDto())
                    .FirstAsync(ct);

                return Ok(updated);
            }

            // Otherwise, try to find an identical (but soft-deleted) row to undelete
            var match = await _db.ProviderAvailabilities.FirstOrDefaultAsync(a =>
                a.OrganizationId == OrganizationId &&
                a.ServiceProviderId == dto.ServiceProviderId &&
                a.DayOfWeek == dto.DayOfWeek &&
                a.StartLocalTime == dto.StartLocalTime &&
                a.EndLocalTime == dto.EndLocalTime &&
                a.EffectiveFrom == dto.EffectiveFrom &&
                a.EffectiveTo == dto.EffectiveTo, ct);

            if (match is not null)
            {
                // If another active row overlaps, validator will catch it
                var (okM, errM) = await ValidateAvailabilityAsync(
                    dto.ServiceProviderId, dto.DayOfWeek,
                    dto.StartLocalTime, dto.EndLocalTime,
                    dto.EffectiveFrom, dto.EffectiveTo,
                    ignoreId: match.Id, ct);
                if (!okM) return BadRequest(errM);

                match.IsDeleted = false;
                await _db.SaveChangesAsync(ct);

                var revived = await _db.ProviderAvailabilities.AsNoTracking()
                    .Where(a => a.Id == match.Id)
                    .Select(ToDto())
                    .FirstAsync(ct);

                return Ok(revived);
            }

            // No match → create
            var (ok, error) = await ValidateAvailabilityAsync(
                dto.ServiceProviderId, dto.DayOfWeek,
                dto.StartLocalTime, dto.EndLocalTime,
                dto.EffectiveFrom, dto.EffectiveTo,
                ignoreId: null, ct);
            if (!ok) return BadRequest(error);

            var entity = new ProviderAvailability
            {
                OrganizationId = OrganizationId,
                ServiceProviderId = dto.ServiceProviderId,
                DayOfWeek = dto.DayOfWeek,
                StartLocalTime = dto.StartLocalTime,
                EndLocalTime = dto.EndLocalTime,
                EffectiveFrom = dto.EffectiveFrom,
                EffectiveTo = dto.EffectiveTo,
                IsDeleted = false
            };

            _db.ProviderAvailabilities.Add(entity);
            await _db.SaveChangesAsync(ct);

            var read = await _db.ProviderAvailabilities.AsNoTracking()
                .Where(a => a.Id == entity.Id)
                .Select(ToDto())
                .FirstAsync(ct);

            return CreatedAtAction(nameof(GetById), new { id = read.Id }, read);
        }

        // -------------------------
        // Helpers
        // -------------------------

        private static Expression<Func<ProviderAvailability, ProviderAvailabilityDto>> ToDto() => a => new ProviderAvailabilityDto
        {
            Id = a.Id,
            OrganizationId = a.OrganizationId,
            ServiceProviderId = a.ServiceProviderId,
            DayOfWeek = a.DayOfWeek,
            StartLocalTime = a.StartLocalTime,
            EndLocalTime = a.EndLocalTime,
            EffectiveFrom = a.EffectiveFrom,
            EffectiveTo = a.EffectiveTo,
            IsDeleted = a.IsDeleted
        };

        private async Task<(bool ok, string? error)> ValidateAvailabilityAsync(
            string providerId,
            DayOfWeek day,
            TimeSpan start,
            TimeSpan end,
            DateOnly from,
            DateOnly to,
            int? ignoreId,
            CancellationToken ct)
        {
            if (end <= start) return (false, "EndLocalTime must be after StartLocalTime.");
            if (to < from) return (false, "EffectiveTo must be on or after EffectiveFrom.");

            // Overlap check: same provider/day + overlapping date windows + overlapping time windows
            var overlaps = await _db.ProviderAvailabilities
                .Where(a => a.OrganizationId == OrganizationId &&
                            a.ServiceProviderId == providerId &&
                            a.DayOfWeek == day &&
                            !a.IsDeleted &&
                            (ignoreId == null || a.Id != ignoreId.Value))
                .AnyAsync(a =>
                    // date windows overlap?
                    !(to < a.EffectiveFrom || from > a.EffectiveTo)
                    &&
                    // time windows overlap?
                    !(end <= a.StartLocalTime || start >= a.EndLocalTime)
                , ct);

            if (overlaps) return (false, "Overlaps an existing availability window for this provider and day.");

            return (true, null);
        }
    }
}
