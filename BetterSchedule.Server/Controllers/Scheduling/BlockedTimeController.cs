using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.BlockedTime;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Services.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using static BetterSchedule.Server.Auth.BlockedTimeScopes;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    /// <summary>
    /// Manages provider/resource blocked time windows (PTO, maintenance, holds).
    /// Visibility and modification are governed by role and ownership.
    /// </summary>
    [ApiController]
    [Route("api/blocked-times")]
    [Authorize]
    public sealed class BlockedTimeController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly ISchedulingConflictService _conflicts;

        /// <summary>Initializes a new instance of <see cref="BlockedTimeController"/>.</summary>
        public BlockedTimeController(ApplicationDbContext db, ISchedulingConflictService conflicts)
        {
            _db = db;
            _conflicts = conflicts;
        }

        /// <summary>
        /// Lists blocked time windows overlapping the optional range that are visible to the caller.
        /// Results are ordered by <see cref="BlockedTime.StartTime"/>.
        /// </summary>
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

        /// <summary>Retrieves a single blocked time by identifier.</summary>
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
        /// Creates a new blocked time window. Applies conflict checks (reservations and blocks).
        /// Stamps <see cref="BlockedTime.OrganizationId"/> and <see cref="BlockedTime.CreatedByUserId"/> from claims.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        [ProducesResponseType(typeof(BlockedTimeDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<BlockedTimeDto>> Create([FromBody] CreateBlockedTimeDto dto, CancellationToken ct)
        {
            if (dto.StartTime >= dto.EndTime)
                return BadRequest("EndTime must be after StartTime.");

            var c = await _conflicts.CheckBlockedTimeCreateAsync(
                OrganizationId,
                createdByUserId: UserId!,
                resourceId: dto.ResourceId,
                start: dto.StartTime,
                end: dto.EndTime,
                cancellationToken: ct);

            if (c.OverlapsReservations)
                return Conflict(new { code = "RESERVATION_CONFLICT", message = "This block overlaps one or more reservations." });

            if (c.OverlapsOtherBlocks)
                return Conflict(new { code = "BLOCK_OVERLAP", message = "This block overlaps an existing blocked time." });

            var entity = new BlockedTime
            {
                OrganizationId = OrganizationId,
                Reason = dto.Reason,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                ResourceId = dto.ResourceId,
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
        /// Updates an existing blocked time window. Applies conflict checks and ownership policy.
        /// </summary>
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateBlockedTimeDto dto, CancellationToken ct)
        {
            var entity = await _db.BlockedTimes
                .FirstOrDefaultAsync(x => x.Id == id && x.OrganizationId == OrganizationId && !x.IsDeleted, ct);

            if (entity is null) return NotFound();
            if (!CanModify(entity, UserId, IsManager, IsProvider)) return Forbid();

            if (dto.StartTime >= dto.EndTime)
                return BadRequest("EndTime must be after StartTime.");

            var c = await _conflicts.CheckBlockedTimeUpdateAsync(
                blockedTimeId: id,
                organizationId: OrganizationId,
                createdByUserId: entity.CreatedByUserId,
                resourceId: dto.ResourceId,
                start: dto.StartTime,
                end: dto.EndTime,
                cancellationToken: ct);

            if (c.OverlapsReservations)
                return Conflict(new { code = "RESERVATION_CONFLICT", message = "This block overlaps one or more reservations." });

            if (c.OverlapsOtherBlocks)
                return Conflict(new { code = "BLOCK_OVERLAP", message = "This block overlaps an existing blocked time." });

            entity.Reason = dto.Reason;
            entity.StartTime = dto.StartTime;
            entity.EndTime = dto.EndTime;
            entity.ResourceId = dto.ResourceId;
            entity.BackColor = dto.BackColor;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        /// <summary>Soft-deletes a blocked time (marks <see cref="BlockedTime.IsDeleted"/>).</summary>
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
            if (!CanModify(entity, UserId, IsManager, IsProvider)) return Forbid();

            entity.IsDeleted = true;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        /// <summary>Projection: <see cref="BlockedTime"/> → <see cref="BlockedTimeDto"/>.</summary>
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
            CreatedByUser = null, // optional: resolve display name
            IsDeleted = x.IsDeleted
        };
    }
}
