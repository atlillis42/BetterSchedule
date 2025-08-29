using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.ProviderAvailability;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Models.Tenant;
using BetterSchedule.Server.Services.Time;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    /// <summary>
    /// APIs for querying and managing provider weekly availability within an organization.
    /// Enforces org scoping and role-based permissions.
    /// </summary>
    [ApiController]
    [Route("api/provider-availability")]
    [Authorize]
    public sealed class ProviderAvailabilityController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IDateTimeProvider _clock;

        /// <summary>
        /// Initializes a new instance of the controller with the database context and clock.
        /// </summary>
        /// <param name="db">The application database context.</param>
        /// <param name="clock">A time provider for organization-local calculations.</param>
        public ProviderAvailabilityController(ApplicationDbContext db, IDateTimeProvider clock)
        {
            _db = db;
            _clock = clock;
        }

        /// <summary>
        /// Gets availability rows visible to the current user, optionally filtered by provider.
        /// </summary>
        /// <param name="providerId">Optional service provider user ID filter.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>Availability rows in the caller's organization.</returns>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProviderAvailabilityDto>>> List(
            [FromQuery] string? providerId,
            CancellationToken ct)
        {
            var query = _db.ProviderAvailabilities
                .VisibleTo(OrganizationId, UserIdOrThrow, IsManager, IsProvider, IsClient);

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

        /// <summary>
        /// Gets a single availability row by identifier using the same visibility rules as list.
        /// </summary>
        /// <param name="id">The availability row identifier.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>The availability row if visible; otherwise <see cref="NotFoundResult"/>.</returns>
        [HttpGet("{id:int}")]
        public async Task<ActionResult<ProviderAvailabilityDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var dto = await _db.ProviderAvailabilities
                .VisibleTo(OrganizationId, UserIdOrThrow, IsManager, IsProvider, IsClient)
                .Where(a => a.Id == id)
                .Select(ToDto())
                .FirstOrDefaultAsync(ct);

            return dto is null ? NotFound() : Ok(dto);
        }

        /// <summary>
        /// Ensures a provider has default Mon–Fri availability using organization business hours.
        /// </summary>
        /// <remarks>
        /// Uses <see cref="OrganizationSettings.BusinessHoursStartLocal"/> and
        /// <see cref="OrganizationSettings.BusinessHoursEndLocal"/> in the organization time zone;
        /// falls back to 09:00 to 17:00 when not configured.
        /// </remarks>
        /// <param name="providerId">The target service provider user ID.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>An object indicating whether rows were created and how many.</returns>
        [HttpPost("providers/{providerId}/ensure-default")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> EnsureDefaultForProvider([FromRoute] string providerId, CancellationToken ct)
        {
            if (IsProvider && !IsManager && providerId != UserIdOrThrow)
                return Forbid();

            var hasAny = await _db.ProviderAvailabilities
                .AnyAsync(a => a.OrganizationId == OrganizationId && a.ServiceProviderId == providerId && !a.IsDeleted, ct);

            if (hasAny) return Ok(new { created = false, count = 0 });

            var s = await _db.OrganizationSettings.FirstOrDefaultAsync(x => x.OrganizationId == OrganizationId, ct);
            var tzId = s?.TimeZoneId ?? "UTC";

            var start = s?.BusinessHoursStartLocal ?? new TimeSpan(9, 0, 0);
            var end = s?.BusinessHoursEndLocal ?? new TimeSpan(17, 0, 0);

            var todayLocal = _clock.TodayInTimeZone(tzId);
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
                    EffectiveFrom = todayLocal,
                    EffectiveTo = far,
                    IsDeleted = false
                });
            }

            var count = await _db.SaveChangesAsync(ct);
            return Ok(new { created = true, count });
        }

        /// <summary>
        /// Creates a new availability row for a provider in the organization.
        /// </summary>
        /// <param name="dto">The availability details, including provider, day, local times, and effective dates.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>The created availability row.</returns>
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<ActionResult<ProviderAvailabilityDto>> Create(
            [FromBody] CreateProviderAvailabilityDto dto,
            CancellationToken ct)
        {
            if (IsProvider && !IsManager && dto.ServiceProviderId != UserIdOrThrow)
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

        /// <summary>
        /// Updates an existing availability row. Managers can edit any row; providers can edit their own.
        /// </summary>
        /// <param name="id">The availability row identifier.</param>
        /// <param name="dto">The partial set of fields to update.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns><see cref="NoContentResult"/> on success; otherwise an error result.</returns>
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Update(
            [FromRoute] int id,
            [FromBody] UpdateProviderAvailabilityDto dto,
            CancellationToken ct)
        {
            var entity = await _db.ProviderAvailabilities
                .EditableBy(OrganizationId, UserIdOrThrow, IsManager, IsProvider)
                .FirstOrDefaultAsync(a => a.Id == id, ct);

            if (entity is null) return NotFound();

            var providerId = dto.ServiceProviderId ?? entity.ServiceProviderId;

            if (IsProvider && !IsManager && providerId != UserIdOrThrow)
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

        /// <summary>
        /// Soft-deletes an availability row. Managers can delete any row; providers can delete their own.
        /// </summary>
        /// <param name="id">The availability row identifier.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns><see cref="NoContentResult"/> on success; otherwise an error result.</returns>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
        {
            var entity = await _db.ProviderAvailabilities
                .EditableBy(OrganizationId, UserIdOrThrow, IsManager, IsProvider)
                .FirstOrDefaultAsync(a => a.Id == id, ct);

            if (entity is null) return NotFound();

            entity.IsDeleted = true;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        /// <summary>
        /// Projects a <see cref="ProviderAvailability"/> to <see cref="ProviderAvailabilityDto"/> for responses.
        /// </summary>
        /// <returns>An expression suitable for LINQ-to-Entities projections.</returns>
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

        /// <summary>
        /// Validates a weekly availability window within the organization.
        /// </summary>
        /// <param name="providerId">Target service provider user ID.</param>
        /// <param name="day">Day of week for the weekly rule.</param>
        /// <param name="start">Local start time of day (inclusive).</param>
        /// <param name="end">Local end time of day (exclusive).</param>
        /// <param name="from">First local date the rule is effective.</param>
        /// <param name="to">Last local date the rule is effective.</param>
        /// <param name="ignoreId">Optional row identifier to exclude from overlap checks.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns><c>(true, null)</c> when valid; otherwise <c>(false, message)</c>.</returns>
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

            var overlaps = await _db.ProviderAvailabilities
                .Where(a => a.OrganizationId == OrganizationId &&
                            a.ServiceProviderId == providerId &&
                            a.DayOfWeek == day &&
                            !a.IsDeleted &&
                            (ignoreId == null || a.Id != ignoreId.Value))
                .AnyAsync(a =>
                    !(to < a.EffectiveFrom || from > a.EffectiveTo) &&
                    !(end <= a.StartLocalTime || start >= a.EndLocalTime), ct);

            if (overlaps) return (false, "Overlaps an existing availability window for this provider and day.");

            return (true, null);
        }
    }
}
