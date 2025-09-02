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
    /// A block with <c>ResourceId = null</c> applies to the creator's schedule (provider self-block).
    /// A block with <c>ResourceId</c> set applies to that resource regardless of provider.
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
        /// Creates a blocked time. Validates time order, resource existence when provided,
        /// and applies reservation/block conflict checks.
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

            if (dto.ResourceId.HasValue)
            {
                var exists = await _db.CalendarResources
                    .AnyAsync(r => r.Id == dto.ResourceId && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);
                if (!exists) return BadRequest(new ApiError("VALIDATION_ERROR", "Resource does not exist in this organization."));
            }

            var conflicts = await _conflicts.CheckBlockedTimeCreateAsync(
                organizationId: OrganizationId,
                createdByUserId: UserId!,
                resourceId: dto.ResourceId,
                start: dto.StartTime,
                end: dto.EndTime,
                cancellationToken: ct);

            if (conflicts.OverlapsReservations)
                return Conflict(new ApiError("Reservation_Conflict", "This block overlaps one or more reservations."));
            if (conflicts.OverlapsOtherBlocks)
                return Conflict(new ApiError("BLOCK_OVERLAP", "This block overlaps an existing blocked time."));

            var entity = new BlockedTime
            {
                OrganizationId = OrganizationId,
                Reason = dto.Reason,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                ResourceId = dto.ResourceId, // null => provider self-block
                BackColor = dto.BackColor,
                CreatedByUserId = UserId!,
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
        /// Updates a blocked time. Supports partial updates and resource unassignment (provider self-block) via <c>clearResource</c>.
        /// Validates time order and conflict checks using effective values.
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

            var newStart = dto.StartTime ?? entity.StartTime;
            var newEnd = dto.EndTime ?? entity.EndTime;
            if (newStart >= newEnd)
                return BadRequest(new ApiError("VALIDATION_ERROR", "EndTime must be after StartTime."));

            if (dto.ClearResource == true && dto.ResourceId.HasValue)
                return BadRequest(new ApiError("VALIDATION_ERROR", "Provide either clearResource or resourceId, not both."));

            int? newResourceId = entity.ResourceId;
            if (dto.ClearResource == true)
            {
                newResourceId = null; // provider self-block for the creator
            }
            else if (dto.ResourceId.HasValue)
            {
                var target = dto.ResourceId.Value;
                var exists = await _db.CalendarResources
                    .AnyAsync(r => r.Id == target && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);
                if (!exists) return BadRequest(new ApiError("VALIDATION_ERROR", "Resource does not exist in this organization."));
                newResourceId = target;
            }

            var conflicts = await _conflicts.CheckBlockedTimeUpdateAsync(
                blockedTimeId: id,
                organizationId: OrganizationId,
                createdByUserId: entity.CreatedByUserId,
                resourceId: newResourceId,
                start: newStart,
                end: newEnd,
                cancellationToken: ct);

            if (conflicts.OverlapsReservations)
                return Conflict(new ApiError("Reservation_Conflict", "This block overlaps one or more reservations."));
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

        /// <summary>Projection to <see cref="BlockedTimeDto"/>.</summary>
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
