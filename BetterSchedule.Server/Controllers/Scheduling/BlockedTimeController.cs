using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.BlockedTime;
using BetterSchedule.Server.Models.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static BetterSchedule.Server.Auth.BlockedTimeScopes;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    [ApiController]
    [Route("api/blocked-times")]
    [Authorize]
    public sealed class BlockedTimeController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        public BlockedTimeController(ApplicationDbContext db) => _db = db;

        // GET /api/blocked-times?start=...&end=...
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BlockedTimeDto>>> List(
            [FromQuery] DateTimeOffset? start,
            [FromQuery] DateTimeOffset? end,
            CancellationToken ct)
        {
            var items = await _db.BlockedTimes
                .VisibleTo(OrganizationId, IsManager, IsProvider)
                .Overlapping(start, end)
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
                    CreatedByUserId = b.CreatedByUserId, 
                    CreatedByUser = null,
                    IsDeleted = b.IsDeleted
                })
                .ToListAsync(ct);

            return Ok(items);
        }

        // GET /api/blocked-times/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<BlockedTimeDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var b = await _db.BlockedTimes
                .VisibleTo(OrganizationId, IsManager, IsProvider)
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            if (b is null) return NotFound();

            return Ok(new BlockedTimeDto
            {
                Id = b.Id,
                OrganizationId = b.OrganizationId,
                Reason = b.Reason!,
                StartTime = b.StartTime,
                EndTime = b.EndTime,
                ResourceId = b.ResourceId,
                BackColor = b.BackColor,
                IsDeleted = b.IsDeleted
            });
        }

        // POST /api/blocked-times
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<ActionResult<BlockedTimeDto>> Create([FromBody] CreateBlockedTimeDto dto, CancellationToken ct)
        {
            if (dto.StartTime >= dto.EndTime)
                return BadRequest("EndTime must be after StartTime.");

            var bt = new BlockedTime
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

            _db.BlockedTimes.Add(bt);
            await _db.SaveChangesAsync(ct);

            var read = await _db.BlockedTimes.AsNoTracking()
                .Where(x => x.Id == bt.Id)
                .Select(x => new BlockedTimeDto
                {
                    Id = x.Id,
                    OrganizationId = x.OrganizationId,
                    Reason = x.Reason!,
                    StartTime = x.StartTime,
                    EndTime = x.EndTime,
                    ResourceId = x.ResourceId,
                    BackColor = x.BackColor,
                    IsDeleted = x.IsDeleted
                })
                .FirstAsync(ct);

            return CreatedAtAction(nameof(GetById), new { id = read.Id }, read);
        }

        // PUT /api/blocked-times/{id}
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateBlockedTimeDto dto, CancellationToken ct)
        {
            var b = await _db.BlockedTimes
                .FirstOrDefaultAsync(x => x.Id == id && x.OrganizationId == OrganizationId && !x.IsDeleted, ct);

            if (b is null) return NotFound();
            if (!BlockedTimeScopes.CanModify(b, UserId, IsManager, IsProvider)) return Forbid();

            if (dto.StartTime >= dto.EndTime)
                return BadRequest("EndTime must be after StartTime.");

            b.Reason = dto.Reason;
            b.StartTime = dto.StartTime;
            b.EndTime = dto.EndTime;
            b.ResourceId = dto.ResourceId;
            b.BackColor = dto.BackColor;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // DELETE /api/blocked-times/{id}
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
        {
            var b = await _db.BlockedTimes
                .FirstOrDefaultAsync(x => x.Id == id && x.OrganizationId == OrganizationId && !x.IsDeleted, ct);

            if (b is null) return NotFound();
            if (!BlockedTimeScopes.CanModify(b, UserId, IsManager, IsProvider)) return Forbid();

            b.IsDeleted = true;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }
    }
}
