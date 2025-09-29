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
using BetterSchedule.Server.Services.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static BetterSchedule.Server.Auth.BlockedTimeScopes;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    /// <summary>
    /// Manages blocked time windows for provider schedules and resources.
    /// - When ResourceId is null, the block applies to a provider's personal schedule (the "owner" provider is stored in CreatedByUserId).
    /// - When ResourceId is set, the block applies to that resource regardless of provider.
    /// Managers can create either kind; providers can only self-block (no resource).
    /// </summary>
    [ApiController]
    [Route("api/blocked-times")]
    [Authorize]
    public sealed class BlockedTimeController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly ISchedulingConflictService _conflicts;

        public BlockedTimeController(ApplicationDbContext db, ISchedulingConflictService conflicts)
        {
            _db = db;
            _conflicts = conflicts;
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
        /// Creates a blocked time. Managers must pick either a provider OR a resource.
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

            // ---- Role + targeting rules
            string ownerProviderIdForBlock; // who the self-block applies to when ResourceId is null
            if (IsManager)
            {
                var hasProvider = !string.IsNullOrWhiteSpace(dto.ProviderId);
                var hasResource = dto.ResourceId.HasValue;

                if (hasProvider && hasResource)
                    return BadRequest(new ApiError("VALIDATION_ERROR", "Choose either a provider or a resource, not both."));
                if (!hasProvider && !hasResource)
                    return BadRequest(new ApiError("VALIDATION_ERROR", "Managers must select a provider or a resource."));

                // When targeting a provider, validate that user exists in this org
                if (hasProvider)
                {
                    var providerExists = await _db.Users.AnyAsync(
                        u => u.Id == dto.ProviderId && u.OrganizationId == OrganizationId && !u.IsDeleted, ct);
                    if (!providerExists)
                        return BadRequest(new ApiError("VALIDATION_ERROR", "Provider does not exist in this organization."));
                }

                // For provider blocks, stamp the provider as the "owner" (keeps scopes & conflicts working)
                ownerProviderIdForBlock = hasProvider ? dto.ProviderId! : UserId!;
            }
            else
            {
                // Provider caller
                if (dto.ResourceId.HasValue)
                    return BadRequest(new ApiError("VALIDATION_ERROR", "Providers cannot create resource blocks."));
                ownerProviderIdForBlock = UserId!;
            }

            // Resource existence when provided
            if (dto.ResourceId.HasValue)
            {
                var exists = await _db.CalendarResources
                    .AnyAsync(r => r.Id == dto.ResourceId && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);
                if (!exists) return BadRequest(new ApiError("VALIDATION_ERROR", "Resource does not exist in this organization."));
            }

            // Conflicts check
            var conflicts = await _conflicts.CheckBlockedTimeCreateAsync(
                organizationId: OrganizationId,
                createdByUserId: ownerProviderIdForBlock,
                resourceId: dto.ResourceId,
                start: dto.StartTime,
                end: dto.EndTime,
                cancellationToken: ct);

            if (conflicts.OverlapsReservations)
                return Conflict(new ApiError("RESERVATION_CONFLICT", "This block overlaps one or more reservations."));
            if (conflicts.OverlapsOtherBlocks)
                return Conflict(new ApiError("BLOCK_OVERLAP", "This block overlaps an existing blocked time."));

            var entity = new BlockedTime
            {
                OrganizationId = OrganizationId,
                Reason = dto.Reason,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                ResourceId = dto.ResourceId,              // null => provider schedule
                BackColor = dto.BackColor,
                CreatedByUserId = ownerProviderIdForBlock, // provider whose calendar is blocked (or manager if resource block)
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

            // Providers cannot manipulate resource targeting at all
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

            var conflicts = await _conflicts.CheckBlockedTimeUpdateAsync(
                blockedTimeId: id,
                organizationId: OrganizationId,
                createdByUserId: entity.CreatedByUserId, // the provider whose calendar is blocked (if ResourceId is null)
                resourceId: newResourceId,
                start: newStart,
                end: newEnd,
                cancellationToken: ct);

            if (conflicts.OverlapsReservations)
                return Conflict(new ApiError("RESERVATION_CONFLICT", "This block overlaps one or more reservations."));
            if (conflicts.OverlapsOtherBlocks)
                return Conflict(new ApiError("BLOCK_OVERLAP", "This block overlaps an existing blocked time."));

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
