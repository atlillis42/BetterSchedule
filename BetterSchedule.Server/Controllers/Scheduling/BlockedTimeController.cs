using BetterSchedule.Server.Auth;
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
    /// 
    /// <para><b>Visibility</b>:
    /// Results are scoped to the caller's organization and exclude soft-deleted rows.
    /// <see cref="BlockedTimeScopes.VisibleTo(IQueryable{BlockedTime}, string, bool, bool)"/> 
    /// governs which rows are visible to Managers and Service Providers.</para>
    /// 
    /// <para><b>Policies</b>:
    /// <list type="bullet">
    /// <item><description><b>Overlap rules</b> (hard guards):
    /// A new/updated block cannot overlap existing reservations (<c>RESERVATION_CONFLICT</c>) 
    /// or other blocks (<c>BLOCK_OVERLAP</c>) for cleanliness.</description></item>
    /// <item><description><b>Ownership</b>:
    /// Managers may create/update/delete any block. Service Providers may manage blocks they created.</description></item>
    /// <item><description><b>Soft deletes</b>:
    /// Delete operations mark <see cref="BlockedTime.IsDeleted"/> and do not remove rows.</description></item>
    /// </list></para>
    /// 
    /// <para><b>Error contract</b>:
    /// <list type="bullet">
    /// <item><description><c>400</c> – validation failure (e.g., EndTime &lt;= StartTime)</description></item>
    /// <item><description><c>403</c> – insufficient privileges per <see cref="BlockedTimeScopes.CanModify"/></description></item>
    /// <item><description><c>404</c> – not found in org or already deleted</description></item>
    /// <item><description><c>409</c> – conflict:
    /// <c>{ code: "RESERVATION_CONFLICT" | "BLOCK_OVERLAP", message: string }</c></description></item>
    /// </list></para>
    /// </summary>
    [ApiController]
    [Route("api/blocked-times")]
    [Authorize]
    public sealed class BlockedTimeController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly ISchedulingConflictService _conflicts;

        /// <summary>
        /// Initializes a new instance of the <see cref="BlockedTimeController"/> class.
        /// </summary>
        /// <param name="db">Database context for blocked time operations.</param>
        /// <param name="conflicts">Centralized scheduling conflict service.</param>
        public BlockedTimeController(ApplicationDbContext db, ISchedulingConflictService conflicts)
        {
            _db = db;
            _conflicts = conflicts;
        }

        /// <summary>
        /// Lists blocked time windows overlapping the optional range, visible to the caller.
        /// Results are ordered by <see cref="BlockedTime.StartTime"/>.
        /// </summary>
        /// <param name="start">Optional start of the range to filter.</param>
        /// <param name="end">Optional end of the range to filter.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>Collection of <see cref="BlockedTimeDto"/>.</returns>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<BlockedTimeDto>), 200)]
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

        /// <summary>
        /// Retrieves a single blocked time by identifier (scoped to the caller's organization).
        /// </summary>
        /// <param name="id">The blocked time identifier.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>The blocked time DTO if found; otherwise <see cref="NotFound"/>.</returns>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(BlockedTimeDto), 200)]
        [ProducesResponseType(404)]
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
        /// Creates a new blocked time window.
        /// <para><b>Guards</b>:
        /// <list type="bullet">
        /// <item><description>End must be after start.</description></item>
        /// <item><description>No overlap with existing reservations (<c>RESERVATION_CONFLICT</c>).</description></item>
        /// <item><description>No overlap with other blocks (<c>BLOCK_OVERLAP</c>).</description></item>
        /// </list></para>
        /// <para><b>Stamping</b>: <see cref="BlockedTime.OrganizationId"/> and <see cref="BlockedTime.CreatedByUserId"/> 
        /// are derived from the caller's claims.</para>
        /// </summary>
        /// <param name="dto">Values describing the block.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>The created <see cref="BlockedTimeDto"/>.</returns>
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        [ProducesResponseType(typeof(BlockedTimeDto), 201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(409)]
        public async Task<ActionResult<BlockedTimeDto>> Create([FromBody] CreateBlockedTimeDto dto, CancellationToken ct)
        {
            if (dto.StartTime >= dto.EndTime)
                return BadRequest("EndTime must be after StartTime.");

            // HARD GUARDS per policy (no overlaps with reservations or other blocks)
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
        /// Updates an existing blocked time window.
        /// <para><b>Authorization</b>:
        /// Managers can update any row. Providers can update rows they created
        /// (see <see cref="BlockedTimeScopes.CanModify"/>).</para>
        /// <para><b>Guards</b>:
        /// <list type="bullet">
        /// <item><description>End must be after start.</description></item>
        /// <item><description>No overlap with existing reservations (<c>RESERVATION_CONFLICT</c>).</description></item>
        /// <item><description>No overlap with other blocks (<c>BLOCK_OVERLAP</c>).</description></item>
        /// </list></para>
        /// </summary>
        /// <param name="id">The blocked time identifier.</param>
        /// <param name="dto">Updated values for the block.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns><see cref="NoContent"/> on success; validation/authorization/conflict errors otherwise.</returns>
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        [ProducesResponseType(204)]
        [ProducesResponseType(400)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
        [ProducesResponseType(409)]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateBlockedTimeDto dto, CancellationToken ct)
        {
            var entity = await _db.BlockedTimes
                .FirstOrDefaultAsync(x => x.Id == id && x.OrganizationId == OrganizationId && !x.IsDeleted, ct);

            if (entity is null) return NotFound();
            if (!CanModify(entity, UserId, IsManager, IsProvider)) return Forbid();

            if (dto.StartTime >= dto.EndTime)
                return BadRequest("EndTime must be after StartTime.");

            // HARD GUARDS per policy
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

        /// <summary>
        /// Soft deletes a blocked time entry by marking <see cref="BlockedTime.IsDeleted"/>.
        /// <para><b>Authorization</b>: Managers or the creating provider.</para>
        /// </summary>
        /// <param name="id">The blocked time identifier.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns><see cref="NoContent"/> on success; <see cref="NotFound"/> or <see cref="ForbidResult"/> otherwise.</returns>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        [ProducesResponseType(204)]
        [ProducesResponseType(403)]
        [ProducesResponseType(404)]
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

        // ----------------------------------------------------------------
        // Helpers
        // ----------------------------------------------------------------

        /// <summary>
        /// Maps <see cref="BlockedTime"/> to <see cref="BlockedTimeDto"/>.
        /// Includes CreatedByUserId to support client-side ownership nudges.
        /// </summary>
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
            CreatedByUser = null, // TODO: Show display name instead of Id
            IsDeleted = x.IsDeleted
        };
    }
}
