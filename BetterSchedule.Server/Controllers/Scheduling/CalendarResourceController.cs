// BetterSchedule.Server/Controllers/Calendar/CalendarResourceController.cs
using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Models.DTOs.BlockedTime;
using BetterSchedule.Server.Models.DTOs.CalendarResource;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Controllers.Calendar
{
    [ApiController]
    [Route("api/calendar-resources")]
    [Authorize]
    public class CalendarResourceController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        public CalendarResourceController(ApplicationDbContext db) => _db = db;

        private string OrgId => User.GetOrgIdOrThrow();

        // GET /api/calendar-resources  (lean: no BlockedTimes to keep payload small)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CalendarResourceDto>>> List(CancellationToken ct)
        {
            var orgId = OrgId;

            var items = await _db.CalendarResources
                .AsNoTracking()
                .Where(r => r.OrganizationId == orgId && !r.IsDeleted)
                .OrderBy(r => r.Name)
                .Select(r => new CalendarResourceDto
                {
                    Id = r.Id,
                    OrganizationId = r.OrganizationId,
                    Name = r.Name,
                    BackColor = r.BackColor,
                    BlockedTimes = new(), // intentionally empty on the list
                    IsDeleted = r.IsDeleted
                })
                .ToListAsync(ct);

            return Ok(items);
        }

        // GET /api/calendar-resources/{id}?start=...&end=...
        // Enriched: includes BlockedTimes for this resource (optionally filtered by overlap with start/end).
        [HttpGet("{id:int}")]
        public async Task<ActionResult<CalendarResourceDto>> GetById(
            [FromRoute] int id,
            [FromQuery] DateTimeOffset? start,
            [FromQuery] DateTimeOffset? end,
            CancellationToken ct)
        {
            var orgId = OrgId;

            // Fetch the resource first (scoped to org)
            var resource = await _db.CalendarResources
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id && r.OrganizationId == orgId && !r.IsDeleted, ct);

            if (resource is null) return NotFound();

            // Pull this resource's blocked times (scoped to org)
            var btQuery = _db.BlockedTimes
                .AsNoTracking()
                .Where(b => b.OrganizationId == orgId &&
                            b.ResourceId == resource.Id &&
                            !b.IsDeleted);

            if (start.HasValue && end.HasValue)
            {
                // Overlap: Start < end && End > start
                btQuery = btQuery.Where(b => b.StartTime < end.Value && b.EndTime > start.Value);
            }

            var blockedTimes = await btQuery
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

            var dto = new CalendarResourceDto
            {
                Id = resource.Id,
                OrganizationId = resource.OrganizationId,
                Name = resource.Name,
                BackColor = resource.BackColor,
                BlockedTimes = blockedTimes,
                IsDeleted = resource.IsDeleted
            };

            return Ok(dto);
        }

        // POST /api/calendar-resources
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<ActionResult<CalendarResourceDto>> Create([FromBody] CreateCalendarResourceDto dto, CancellationToken ct)
        {
            var orgId = OrgId;

            var entity = new CalendarResource
            {
                OrganizationId = orgId, // stamp from claim
                Name = dto.Name,
                BackColor = dto.BackColor,
                IsDeleted = false
            };

            _db.CalendarResources.Add(entity);
            await _db.SaveChangesAsync(ct);

            var read = new CalendarResourceDto
            {
                Id = entity.Id,
                OrganizationId = entity.OrganizationId,
                Name = entity.Name,
                BackColor = entity.BackColor,
                BlockedTimes = new(),
                IsDeleted = entity.IsDeleted
            };

            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, read);
        }

        // PUT /api/calendar-resources/{id}
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateCalendarResourceDto dto, CancellationToken ct)
        {
            var orgId = OrgId;

            var entity = await _db.CalendarResources
                .FirstOrDefaultAsync(r => r.Id == id && r.OrganizationId == orgId && !r.IsDeleted, ct);

            if (entity is null) return NotFound();

            if (dto.Name is not null) entity.Name = dto.Name;
            if (dto.BackColor is not null) entity.BackColor = dto.BackColor;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // DELETE /api/calendar-resources/{id}
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
        {
            var orgId = OrgId;

            var entity = await _db.CalendarResources
                .FirstOrDefaultAsync(r => r.Id == id && r.OrganizationId == orgId && !r.IsDeleted, ct);

            if (entity is null) return NotFound();

            entity.IsDeleted = true; // soft delete
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }
    }
}
