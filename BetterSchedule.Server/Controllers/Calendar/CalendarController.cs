using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models;
using BetterSchedule.Server.Models.DTOs.Calendar;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BetterSchedule.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CalendarController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;

        public CalendarController(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        #region Resources

        /// <summary>
        /// Returns all calendar resources (optionally filter by org).
        /// </summary>
        [HttpGet("resources")]
        [ProducesResponseType(typeof(IEnumerable<CalendarResourceDto>), 200)]
        public async Task<IActionResult> GetResourcesAsync([FromQuery] string? organizationId = null)
        {
            var query = _dbContext.CalendarResources.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(organizationId))
                query = query.Where(r => r.OrganizationId == organizationId);

            var resources = await query
                .Select(r => new CalendarResourceDto
                {
                    Id = r.Id,
                    OrganizationId = r.OrganizationId,
                    Name = r.Name,
                    BackColor = r.BackColor
                    // BlockedTimes is not included here—fetch separately if needed
                })
                .ToListAsync();

            return Ok(resources);
        }

        #endregion

        #region BlockedTimes

        /// <summary>
        /// Returns blocked time slots that overlap the given window (start, end), optionally filtered by org.
        /// Respects soft-deleted blocks (IsDeleted = false).
        /// </summary>
        [HttpGet("blockedtimes")]
        [ProducesResponseType(typeof(IEnumerable<BlockedTimeDto>), 200)]
        public async Task<IActionResult> GetBlockedTimesAsync(
            [FromQuery] DateTimeOffset start,
            [FromQuery] DateTimeOffset end,
            [FromQuery] string? organizationId = null)
        {
            if (end <= start)
                return BadRequest("End must be after start.");

            var query = _dbContext.BlockedTimes
                .AsNoTracking()
                .Where(b => !b.IsDeleted && b.StartTime < end && b.EndTime > start);

            if (!string.IsNullOrWhiteSpace(organizationId))
                query = query.Where(b => b.OrganizationId == organizationId);

            var blocks = await query
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
                .ToListAsync();

            return Ok(blocks);
        }

        /// <summary>
        /// Create a new blocked time.
        /// </summary>
        [HttpPost("blockedtimes")]
        [ProducesResponseType(typeof(BlockedTimeDto), 201)]
        public async Task<IActionResult> CreateBlockedTimeAsync([FromBody] BlockedTimeCreateDto payload)
        {
            if (string.IsNullOrWhiteSpace(payload.Reason))
                return BadRequest("Reason is required.");
            if (payload.EndTime <= payload.StartTime)
                return BadRequest("End time must be after start time.");

            var entity = new BlockedTime
            {
                Reason = payload.Reason,
                StartTime = payload.StartTime,
                EndTime = payload.EndTime,
                ResourceId = payload.ResourceId,
                BackColor = payload.BackColor ?? "#3a87ad",
                IsDeleted = false,
                OrganizationId = payload.OrganizationId
            };

            _dbContext.BlockedTimes.Add(entity);
            await _dbContext.SaveChangesAsync();

            var dto = new BlockedTimeDto
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

            return Created($"/api/calendar/blockedtimes/{entity.Id}", dto);
        }

        /// <summary>
        /// Update an existing blocked time.
        /// </summary>
        [HttpPut("blockedtimes/{id:int}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> UpdateBlockedTimeAsync(int id, [FromBody] BlockedTimeUpdateDto payload)
        {
            if (string.IsNullOrWhiteSpace(payload.Reason))
                return BadRequest("Reason is required.");
            if (payload.EndTime <= payload.StartTime)
                return BadRequest("End time must be after start time.");

            var entity = await _dbContext.BlockedTimes.FindAsync(id);
            if (entity is null || entity.IsDeleted) return NotFound();

            entity.Reason = payload.Reason;
            entity.StartTime = payload.StartTime;
            entity.EndTime = payload.EndTime;
            entity.ResourceId = payload.ResourceId;
            entity.BackColor = payload.BackColor;
            // OrganizationId should NOT be updatable here (by design)

            await _dbContext.SaveChangesAsync();
            return NoContent();
        }

        /// <summary>
        /// Soft-delete a blocked time by id.
        /// </summary>
        [HttpDelete("blockedtimes/{id:int}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> DeleteBlockedTimeAsync(int id)
        {
            var entity = await _dbContext.BlockedTimes.FindAsync(id);
            if (entity is null || entity.IsDeleted) return NotFound();

            entity.IsDeleted = true;
            await _dbContext.SaveChangesAsync();
            return NoContent();
        }

        #endregion
    }
}
