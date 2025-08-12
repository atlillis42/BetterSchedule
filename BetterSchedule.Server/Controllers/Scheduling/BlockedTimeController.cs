using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Models.DTOs.BlockedTime;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Controllers.Calendar
{
    [ApiController]
    [Route("api/blocked-times")]
    [Authorize]
    public class BlockedTimeController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        public BlockedTimeController(ApplicationDbContext db) => _db = db;

        private string OrgId => User.GetOrgIdOrThrow();

        // GET /api/blocked-times?start=yyyy-MM-dd&end=yyyy-MM-dd
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BlockedTimeDto>>> List(
            [FromQuery] DateTimeOffset? start,
            [FromQuery] DateTimeOffset? end,
            CancellationToken ct)
        {
            var orgId = OrgId;

            var q = _db.BlockedTimes
                .AsNoTracking()
                .Where(b => b.OrganizationId == orgId && !b.IsDeleted);

            if (start.HasValue && end.HasValue)
            {
                // overlap
                q = q.Where(b => b.StartTime < end.Value && b.EndTime > start.Value);
            }

            var items = await q
                .OrderBy(b => b.StartTime)
                .Select(b => new BlockedTimeDto
                {
                    Id = b.Id,
                    OrganizationId = b.OrganizationId,
                    Reason = b.Reason!,
                    StartTime = b.StartTime,
                    EndTime = b.EndTime,
                    ResourceId = b.ResourceId,
                    BackColor = b.BackColor,
                    IsDeleted = b.IsDeleted
                })
                .ToListAsync(ct);

            return Ok(items);
        }

        // GET /api/blocked-times/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<BlockedTimeDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var orgId = OrgId;

            var dto = await _db.BlockedTimes
                .AsNoTracking()
                .Where(b => b.OrganizationId == orgId && !b.IsDeleted && b.Id == id)
                .Select(b => new BlockedTimeDto
                {
                    Id = b.Id,
                    OrganizationId = b.OrganizationId,
                    Reason = b.Reason!,
                    StartTime = b.StartTime,
                    EndTime = b.EndTime,
                    ResourceId = b.ResourceId,
                    BackColor = b.BackColor,
                    IsDeleted = b.IsDeleted
                })
                .FirstOrDefaultAsync(ct);

            return dto is null ? NotFound() : Ok(dto);
        }

        // POST /api/blocked-times
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<ActionResult<BlockedTimeDto>> Create([FromBody] CreateBlockedTimeDto dto, CancellationToken ct)
        {
            var orgId = OrgId;

            if (dto.StartTime >= dto.EndTime)
                return BadRequest("EndTime must be after StartTime.");

            // Ensure resource belongs to org
            var resourceOk = await _db.CalendarResources
                .AnyAsync(r => r.OrganizationId == orgId && r.Id == dto.ResourceId && !r.IsDeleted, ct);
            if (!resourceOk) return NotFound("Resource not found.");

            var entity = new BlockedTime
            {
                OrganizationId = orgId,
                Reason = dto.Reason,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                ResourceId = dto.ResourceId,
                BackColor = dto.BackColor,
                IsDeleted = false
            };

            _db.BlockedTimes.Add(entity);
            await _db.SaveChangesAsync(ct);

            var read = new BlockedTimeDto
            {
                Id = entity.Id,
                OrganizationId = entity.OrganizationId,
                Reason = entity.Reason!,
                StartTime = entity.StartTime,
                EndTime = entity.EndTime,
                ResourceId = entity.ResourceId,
                BackColor = entity.BackColor,
                IsDeleted = entity.IsDeleted
            };

            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, read);
        }

        // PUT /api/blocked-times/{id}
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateBlockedTimeDto dto, CancellationToken ct)
        {
            var orgId = OrgId;

            var entity = await _db.BlockedTimes
                .FirstOrDefaultAsync(b => b.Id == id && b.OrganizationId == orgId && !b.IsDeleted, ct);
            if (entity is null) return NotFound();

            if (dto.StartTime >= dto.EndTime)
                return BadRequest("EndTime must be after StartTime.");

            // If resource changed, ensure it belongs to this org
            if (dto.ResourceId != entity.ResourceId)
            {
                var resourceOk = await _db.CalendarResources
                    .AnyAsync(r => r.OrganizationId == orgId && r.Id == dto.ResourceId && !r.IsDeleted, ct);
                if (!resourceOk) return NotFound("Resource not found.");
            }

            entity.Reason = dto.Reason;
            entity.StartTime = dto.StartTime;
            entity.EndTime = dto.EndTime;
            entity.ResourceId = dto.ResourceId;
            entity.BackColor = dto.BackColor;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // DELETE /api/blocked-times/{id}
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
        {
            var orgId = OrgId;

            var entity = await _db.BlockedTimes
                .FirstOrDefaultAsync(b => b.Id == id && b.OrganizationId == orgId && !b.IsDeleted, ct);
            if (entity is null) return NotFound();

            entity.IsDeleted = true; // soft delete
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }
    }
}
