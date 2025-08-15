using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.BlockedTime;
using BetterSchedule.Server.Models.DTOs.CalendarResource;
using BetterSchedule.Server.Models.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    [ApiController]
    [Route("api/calendar-resources")]
    [Authorize]
    public sealed class CalendarResourceController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        public CalendarResourceController(ApplicationDbContext db) => _db = db;

        // GET /api/calendar-resources
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CalendarResourceDto>>> List(CancellationToken ct)
        {
            var items = await _db.CalendarResources
                .AsNoTracking()
                .Where(r => r.OrganizationId == OrganizationId && !r.IsDeleted)
                .OrderBy(r => r.Name)
                .Select(r => new CalendarResourceDto
                {
                    Id = r.Id,
                    OrganizationId = r.OrganizationId,
                    Name = r.Name,
                    BackColor = r.BackColor,
                    BlockedTimes = new List<BlockedTimeDto>(), // keep empty in list
                    IsDeleted = r.IsDeleted
                })
                .ToListAsync(ct);

            return Ok(items);
        }

        // GET /api/calendar-resources/{id}?start&end
        [HttpGet("{id:int}")]
        public async Task<ActionResult<CalendarResourceDto>> GetById(
            [FromRoute] int id,
            [FromQuery] DateTimeOffset? start,
            [FromQuery] DateTimeOffset? end,
            CancellationToken ct)
        {
            var resource = await _db.CalendarResources
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);

            if (resource is null) return NotFound();

            var btQuery = _db.BlockedTimes
                .AsNoTracking()
                .Where(b => b.OrganizationId == OrganizationId &&
                            b.ResourceId == resource.Id &&
                            !b.IsDeleted);

            if (start.HasValue && end.HasValue)
                btQuery = btQuery.Where(b => b.StartTime < end.Value && b.EndTime > start.Value);

            var dto = new CalendarResourceDto
            {
                Id = resource.Id,
                OrganizationId = resource.OrganizationId,
                Name = resource.Name,
                BackColor = resource.BackColor,
                BlockedTimes = await btQuery
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
                    .ToListAsync(ct),
                IsDeleted = resource.IsDeleted
            };

            return Ok(dto);
        }

        // POST /api/calendar-resources  (Manager only)
        [HttpPost]
        [Authorize(Roles = "Manager")]
        public async Task<ActionResult<CalendarResourceDto>> Create([FromBody] CreateCalendarResourceDto dto, CancellationToken ct)
        {
            var entity = new CalendarResource
            {
                OrganizationId = OrganizationId,
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
                BlockedTimes = new List<BlockedTimeDto>(),
                IsDeleted = entity.IsDeleted
            };

            return CreatedAtAction(nameof(GetById), new { id = read.Id }, read);
        }

        // PUT /api/calendar-resources/{id}  (Manager only)
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateCalendarResourceDto dto, CancellationToken ct)
        {
            var r = await _db.CalendarResources
                .FirstOrDefaultAsync(x => x.Id == id && x.OrganizationId == OrganizationId && !x.IsDeleted, ct);

            if (r is null) return NotFound();

            if (dto.Name is not null) r.Name = dto.Name;
            if (dto.BackColor is not null) r.BackColor = dto.BackColor;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // DELETE /api/calendar-resources/{id}  (Manager only)
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
        {
            var r = await _db.CalendarResources
                .FirstOrDefaultAsync(x => x.Id == id && x.OrganizationId == OrganizationId && !x.IsDeleted, ct);

            if (r is null) return NotFound();

            r.IsDeleted = true;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }
    }
}
