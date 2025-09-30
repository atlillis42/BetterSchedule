using System;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.BlockedTime;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Services.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static BetterSchedule.Server.Auth.BlockedTimeScopes;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    /// <summary>
    /// Manages blocked time windows for provider schedules and resources.
    /// - ResourceId = null -> provider self-block (owner provider is CreatedByUserId).
    /// - ResourceId set -> block applies to that resource regardless of provider.
    /// Managers can create either kind; providers can only self-block (no resource).
    /// </summary>
    [ApiController]
    [Route("api/blocked-times")]
    [Authorize]
    public sealed class BlockedTimeController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;

        public BlockedTimeController(ApplicationDbContext db)
        {
            _db = db;
        }

        /// <summary>Returns blocks overlapping the optional range, ordered by start time.</summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<BlockedTimeDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<BlockedTimeDto>>> List(
            [FromQuery] DateTimeOffset? start,
            [FromQuery] DateTimeOffset? end,
            CancellationToken ct)
        {
            var items = await _db.BlockedTimes
                .VisibleTo(OrganizationId, IsManager, IsProvider)
                .Overlapping(start, end)
                .OrderBy(b => b.StartTime)
                .Select(ToDto())
                .ToListAsync(ct);

            return Ok(items);
        }

        /// <summary>Returns a block by identifier.</summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(BlockedTimeDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<BlockedTimeDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var dto = await _db.BlockedTimes
                .VisibleTo(OrganizationId, IsManager, IsProvider)
                .Where(x => x.Id == id)
                .Select(ToDto())
                .FirstOrDefaultAsync(ct);

            return dto is null ? NotFound() : Ok(dto);
        }

        /// <summary>
        /// Creates a blocked time. Managers may pick either a provider OR a resource.
        /// Providers may only create self-blocks (no resource).
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        [ProducesResponseType(typeof(BlockedTimeDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiError), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiError), StatusCodes.Status409Conflict)]
        public async Task<ActionResult<BlockedTimeDto>> Create([FromBody] CreateBlockedTimeDto dto, CancellationToken ct)
        {
            if (dto.StartTime >= dto.EndTime)
                return BadRequest(new ApiError("VALIDATION_ERROR", "EndTime must be after StartTime."));

            // Role + targeting
            string ownerProviderIdForBlock;
            if (IsManager)
            {
                var hasProvider = !string.IsNullOrWhiteSpace(dto.ProviderId);
                var hasResource = dto.ResourceId.HasValue;

                if (hasProvider && hasResource)
                    return BadRequest(new ApiError("VALIDATION_ERROR", "Choose either a provider or a resource, not both."));
                if (!hasProvider && !hasResource)
                    return BadRequest(new ApiError("VALIDATION_ERROR", "Managers must select a provider or a resource."));

                if (hasProvider)
                {
                    var providerExists = await _db.Users.AnyAsync(
                        u => u.Id == dto.ProviderId && u.OrganizationId == OrganizationId && !u.IsDeleted, ct);
                    if (!providerExists)
                        return BadRequest(new ApiError("VALIDATION_ERROR", "Provider does not exist in this organization."));
                }

                ownerProviderIdForBlock = hasProvider ? dto.ProviderId! : UserId!;
            }
            else
            {
                if (dto.ResourceId.HasValue)
                    return BadRequest(new ApiError("VALIDATION_ERROR", "Providers cannot create resource blocks."));
                ownerProviderIdForBlock = UserId!;
            }

            if (dto.ResourceId.HasValue)
            {
                var exists = await _db.CalendarResources
                    .AnyAsync(r => r.Id == dto.ResourceId && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);
                if (!exists) return BadRequest(new ApiError("VALIDATION_ERROR", "Resource does not exist in this organization."));
            }

            // Load org TZ for human-friendly conflict summaries
            var orgSettings = await _db.OrganizationSettings.AsNoTracking()
                .FirstOrDefaultAsync(s => s.OrganizationId == OrganizationId, ct);
            TimeZoneInfo? tz = null;
            try { if (orgSettings != null && !string.IsNullOrWhiteSpace(orgSettings.TimeZoneId)) tz = TimeZoneInfo.FindSystemTimeZoneById(orgSettings.TimeZoneId); } catch { }

            // ---- Scoped conflict checks ----

            // Reservations scoped: resource blocks => same resource; provider self-blocks => same provider
            var resQuery =
                from r in _db.Reservations.AsNoTracking()
                join u in _db.Users.AsNoTracking() on r.ClientId equals u.Id into uj
                from u in uj.DefaultIfEmpty()
                where r.OrganizationId == OrganizationId
                      && !r.IsDeleted
                      && r.StartTime < dto.EndTime
                      && r.EndTime > dto.StartTime
                select new { r.Id, r.ResourceId, r.ServiceProviderId, r.StartTime, r.EndTime, ClientName = u.UserName };

            if (dto.ResourceId.HasValue)
                resQuery = resQuery.Where(x => x.ResourceId == dto.ResourceId);
            else
                resQuery = resQuery.Where(x => x.ServiceProviderId == ownerProviderIdForBlock);

            var resConflict = await resQuery.OrderBy(x => x.StartTime).FirstOrDefaultAsync(ct);
            if (resConflict is not null)
            {
                string FormatRange(DateTimeOffset s, DateTimeOffset e)
                {
                    DateTimeOffset ls = tz is null ? s.ToLocalTime() : TimeZoneInfo.ConvertTime(s, tz);
                    DateTimeOffset le = tz is null ? e.ToLocalTime() : TimeZoneInfo.ConvertTime(e, tz);
                    return $"{ls:ddd M/d h:mm tt}–{le:h:mm tt}";
                }
                var who = string.IsNullOrWhiteSpace(resConflict.ClientName) ? "Reservation" : resConflict.ClientName;
                var msg = $"This block overlaps one or more reservations. Conflicts with: {who}, {FormatRange(resConflict.StartTime, resConflict.EndTime)}";
                return Conflict(new ApiError("RESERVATION_CONFLICT", msg));
            }

            // Blocked-times scoped: resource blocks => same resource; provider self-blocks => same provider self-blocks
            var blockQuery = _db.BlockedTimes.AsNoTracking()
                .Where(b => b.OrganizationId == OrganizationId && !b.IsDeleted)
                .Where(b => b.StartTime < dto.EndTime && b.EndTime > dto.StartTime);

            if (dto.ResourceId.HasValue)
                blockQuery = blockQuery.Where(b => b.ResourceId == dto.ResourceId);
            else
                blockQuery = blockQuery.Where(b => b.ResourceId == null && b.CreatedByUserId == ownerProviderIdForBlock);

            var blockConflict = await blockQuery
                .OrderBy(b => b.StartTime)
                .Select(b => new { b.Id, b.StartTime, b.EndTime, b.Reason })
                .FirstOrDefaultAsync(ct);

            if (blockConflict is not null)
            {
                DateTimeOffset ls = tz is null ? blockConflict.StartTime.ToLocalTime() : TimeZoneInfo.ConvertTime(blockConflict.StartTime, tz);
                DateTimeOffset le = tz is null ? blockConflict.EndTime.ToLocalTime() : TimeZoneInfo.ConvertTime(blockConflict.EndTime, tz);
                var reason = string.IsNullOrWhiteSpace(blockConflict.Reason) ? "Blocked" : blockConflict.Reason!;
                var msg = $"This block overlaps an existing blocked time. Conflicts with: {reason}, {ls:ddd M/d h:mm tt}–{le:h:mm tt}";
                return Conflict(new ApiError("BLOCK_OVERLAP", msg));
            }

            // ---- end scoped checks ----

            var entity = new BlockedTime
            {
                OrganizationId = OrganizationId,
                Reason = dto.Reason,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                ResourceId = dto.ResourceId,               // null => provider schedule
                BackColor = dto.BackColor,
                CreatedByUserId = ownerProviderIdForBlock, // provider whose calendar is blocked
                IsDeleted = false
            };

            _db.BlockedTimes.Add(entity);
            await _db.SaveChangesAsync(ct);

            var read = await _db.BlockedTimes.AsNoTracking()
                .Where(x => x.Id == entity.Id)
                .Select(ToDto())
                .FirstAsync(ct);

            return CreatedAtAction(nameof(GetById), new { id = read.Id }, read);
        }

        /// <summary>
        /// Updates a blocked time. Providers cannot target resources.
        /// Managers may change the resource (or clear it); provider targeting cannot be changed here.
        /// </summary>
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ApiError), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiError), StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateBlockedTimeDto dto, CancellationToken ct)
        {
            var entity = await _db.BlockedTimes
                .FirstOrDefaultAsync(x => x.Id == id && x.OrganizationId == OrganizationId && !x.IsDeleted, ct);

            if (entity is null) return NotFound();
            if (!BlockedTimeScopes.CanModify(entity, UserId, IsManager, IsProvider)) return Forbid();

            if (IsProvider && !IsManager && (dto.ResourceId.HasValue || dto.ClearResource == true))
                return BadRequest(new ApiError("VALIDATION_ERROR", "Providers cannot change resource targeting on a blocked time."));

            var newStart = dto.StartTime ?? entity.StartTime;
            var newEnd = dto.EndTime ?? entity.EndTime;
            if (newStart >= newEnd)
                return BadRequest(new ApiError("VALIDATION_ERROR", "EndTime must be after StartTime."));

            if (dto.ClearResource == true && dto.ResourceId.HasValue)
                return BadRequest(new ApiError("VALIDATION_ERROR", "Provide either clearResource or resourceId, not both."));

            int? newResourceId = entity.ResourceId;
            if (IsManager)
            {
                if (dto.ClearResource == true)
                {
                    newResourceId = null; // becomes provider schedule block; owner provider remains the existing CreatedByUserId
                }
                else if (dto.ResourceId.HasValue)
                {
                    var target = dto.ResourceId.Value;
                    var exists = await _db.CalendarResources
                        .AnyAsync(r => r.Id == target && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);
                    if (!exists) return BadRequest(new ApiError("VALIDATION_ERROR", "Resource does not exist in this organization."));
                    newResourceId = target;
                }
            }

            // Org TZ for summaries
            var orgSettings = await _db.OrganizationSettings.AsNoTracking()
                .FirstOrDefaultAsync(s => s.OrganizationId == OrganizationId, ct);
            TimeZoneInfo? tz = null;
            try { if (orgSettings != null && !string.IsNullOrWhiteSpace(orgSettings.TimeZoneId)) tz = TimeZoneInfo.FindSystemTimeZoneById(orgSettings.TimeZoneId); } catch { }

            // ---- Scoped conflict checks (like Create) ----

            var resQuery =
                from r in _db.Reservations.AsNoTracking()
                join u in _db.Users.AsNoTracking() on r.ClientId equals u.Id into uj
                from u in uj.DefaultIfEmpty()
                where r.OrganizationId == OrganizationId
                      && !r.IsDeleted
                      && r.StartTime < newEnd
                      && r.EndTime > newStart
                select new { r.Id, r.ResourceId, r.ServiceProviderId, r.StartTime, r.EndTime, ClientName = u.UserName };

            if (newResourceId.HasValue)
                resQuery = resQuery.Where(x => x.ResourceId == newResourceId);
            else
                resQuery = resQuery.Where(x => x.ServiceProviderId == entity.CreatedByUserId);

            var resConflict = await resQuery.OrderBy(x => x.StartTime).FirstOrDefaultAsync(ct);
            if (resConflict is not null)
            {
                DateTimeOffset ls = tz is null ? resConflict.StartTime.ToLocalTime() : TimeZoneInfo.ConvertTime(resConflict.StartTime, tz);
                DateTimeOffset le = tz is null ? resConflict.EndTime.ToLocalTime() : TimeZoneInfo.ConvertTime(resConflict.EndTime, tz);
                var who = string.IsNullOrWhiteSpace(resConflict.ClientName) ? "Reservation" : resConflict.ClientName;
                var msg = $"This block overlaps one or more reservations. Conflicts with: {who}, {ls:ddd M/d h:mm tt}–{le:h:mm tt}";
                return Conflict(new ApiError("RESERVATION_CONFLICT", msg));
            }

            var blockQuery = _db.BlockedTimes.AsNoTracking()
                .Where(b => b.OrganizationId == OrganizationId && !b.IsDeleted && b.Id != id)
                .Where(b => b.StartTime < newEnd && b.EndTime > newStart);

            if (newResourceId.HasValue)
                blockQuery = blockQuery.Where(b => b.ResourceId == newResourceId);
            else
                blockQuery = blockQuery.Where(b => b.ResourceId == null && b.CreatedByUserId == entity.CreatedByUserId);

            var blockConflict = await blockQuery
                .OrderBy(b => b.StartTime)
                .Select(b => new { b.Id, b.StartTime, b.EndTime, b.Reason })
                .FirstOrDefaultAsync(ct);

            if (blockConflict is not null)
            {
                DateTimeOffset ls = tz is null ? blockConflict.StartTime.ToLocalTime() : TimeZoneInfo.ConvertTime(blockConflict.StartTime, tz);
                DateTimeOffset le = tz is null ? blockConflict.EndTime.ToLocalTime() : TimeZoneInfo.ConvertTime(blockConflict.EndTime, tz);
                var reason = string.IsNullOrWhiteSpace(blockConflict.Reason) ? "Blocked" : blockConflict.Reason!;
                var msg = $"This block overlaps an existing blocked time. Conflicts with: {reason}, {ls:ddd M/d h:mm tt}–{le:h:mm tt}";
                return Conflict(new ApiError("BLOCK_OVERLAP", msg));
            }

            // ---- end scoped checks ----

            if (dto.Reason is not null) entity.Reason = dto.Reason;
            entity.StartTime = newStart;
            entity.EndTime = newEnd;
            if (dto.BackColor is not null) entity.BackColor = dto.BackColor;
            entity.ResourceId = newResourceId;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        /// <summary>Soft-deletes a blocked time.</summary>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
        {
            var entity = await _db.BlockedTimes
                .FirstOrDefaultAsync(x => x.Id == id && x.OrganizationId == OrganizationId && !x.IsDeleted, ct);

            if (entity is null) return NotFound();
            if (!BlockedTimeScopes.CanModify(entity, UserId, IsManager, IsProvider)) return Forbid();

            entity.IsDeleted = true;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        private static Expression<Func<BlockedTime, BlockedTimeDto>> ToDto() => x => new BlockedTimeDto
        {
            Id = x.Id,
            OrganizationId = x.OrganizationId,
            Reason = x.Reason!,
            StartTime = x.StartTime,
            EndTime = x.EndTime,
            ResourceId = x.ResourceId,
            BackColor = x.BackColor,
            CreatedByUserId = x.CreatedByUserId,
            CreatedByUserName = x.CreatedByUserName != null ? x.CreatedByUserName.UserName : null,
            IsDeleted = x.IsDeleted
        };
    }
}
