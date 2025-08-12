using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models;
using BetterSchedule.Server.Models.DTOs.AppointmentType;
using BetterSchedule.Server.Models.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // reads for any signed-in user; writes are role-gated
    public sealed class AppointmentTypeController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        public AppointmentTypeController(ApplicationDbContext db) => _db = db;

        private string OrgId => User.GetOrgIdOrThrow();

        // GET /api/appointmenttype
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AppointmentTypeDto>>> List(CancellationToken ct)
        {
            var orgId = OrgId;

            
            var items = await _db.AppointmentTypes
                .AsNoTracking()
                .Where(a => a.OrganizationId == orgId && !a.IsDeleted)
                .OrderBy(a => a.Name)
                .Select(a => new AppointmentTypeDto
                {
                    Id = a.Id,
                    Name = a.Name,
                    Duration = a.Duration,                  // TimeSpan
                    Price = a.Price,
                    Description = a.Description,
                    CreatedByUserId = a.CreatedByUserId,    // stored on entity
                    CreatedByUserName = _db.Users
                        .Where(u => u.Id == a.CreatedByUserId)
                        .Select(u => string.IsNullOrWhiteSpace(u.FullName) ? u.Email : u.FullName)
                        .FirstOrDefault(),
                    AssignedLocationId = a.AssignedLocationId,
                    AssignedLocationName = null,            
                    IsPublic = a.IsPublic,
                    RequiresWaiver = a.RequiresWaiver,
                    IsDeleted = a.IsDeleted,
                    OrganizationId = a.OrganizationId
                })
                .ToListAsync(ct);

            return Ok(items);
        }

        // GET /api/appointmenttype/{id:int}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<AppointmentTypeDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var orgId = OrgId;

            var dto = await _db.AppointmentTypes
                .AsNoTracking()
                .Where(a => a.OrganizationId == orgId && !a.IsDeleted && a.Id == id)
                .Select(a => new AppointmentTypeDto
                {
                    Id = a.Id,
                    Name = a.Name,
                    Duration = a.Duration,
                    Price = a.Price,
                    Description = a.Description,
                    CreatedByUserId = a.CreatedByUserId,
                    CreatedByUserName = _db.Users
                        .Where(u => u.Id == a.CreatedByUserId)
                        .Select(u => string.IsNullOrWhiteSpace(u.FullName) ? u.Email : u.FullName)
                        .FirstOrDefault(),
                    AssignedLocationId = a.AssignedLocationId,
                    AssignedLocationName = null,
                    IsPublic = a.IsPublic,
                    RequiresWaiver = a.RequiresWaiver,
                    IsDeleted = a.IsDeleted,
                    OrganizationId = a.OrganizationId
                })
                .FirstOrDefaultAsync(ct);

            return dto is null ? NotFound() : Ok(dto);
        }

        // POST /api/appointmenttype
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<ActionResult<AppointmentTypeDto>> Create([FromBody] CreateAppointmentTypeDto dto, CancellationToken ct)
        {
            var orgId = OrgId;

            
            var entity = new AppointmentType
            {
                OrganizationId = orgId,
                Name = dto.Name,
                Duration = dto.Duration,
                Price = dto.Price,
                Description = dto.Description,
                CreatedByUserId = dto.CreatedByUserId,   // keep as provided; optionally override with current user if desired
                AssignedLocationId = dto.AssignedLocationId,
                IsPublic = dto.IsPublic,
                RequiresWaiver = dto.RequiresWaiver,
                IsDeleted = false
            };

            _db.AppointmentTypes.Add(entity);
            await _db.SaveChangesAsync(ct);

            // Return full read DTO
            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, new AppointmentTypeDto
            {
                Id = entity.Id,
                Name = entity.Name,
                Duration = entity.Duration,
                Price = entity.Price,
                Description = entity.Description,
                CreatedByUserId = entity.CreatedByUserId,
                CreatedByUserName = await _db.Users
                    .Where(u => u.Id == entity.CreatedByUserId)
                    .Select(u => string.IsNullOrWhiteSpace(u.FullName) ? u.Email : u.FullName)
                    .FirstOrDefaultAsync(ct),
                AssignedLocationId = entity.AssignedLocationId,
                AssignedLocationName = null,
                IsPublic = entity.IsPublic,
                RequiresWaiver = entity.RequiresWaiver,
                IsDeleted = entity.IsDeleted,
                OrganizationId = entity.OrganizationId
            });
        }

        // PUT /api/appointmenttype/{id:int}
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateAppointmentTypeDto dto, CancellationToken ct)
        {
            var orgId = OrgId;

            
            if (dto.Id != id) return BadRequest("Mismatched id.");

            var entity = await _db.AppointmentTypes
                .FirstOrDefaultAsync(a => a.Id == id && a.OrganizationId == orgId && !a.IsDeleted, ct);

            if (entity is null) return NotFound();

            entity.Name = dto.Name ?? entity.Name;
            if (dto.Duration.HasValue) entity.Duration = dto.Duration.Value;
            if (dto.Price.HasValue) entity.Price = dto.Price.Value;
            entity.Description = dto.Description ?? entity.Description;
            if (dto.IsPublic.HasValue) entity.IsPublic = dto.IsPublic.Value;
            if (dto.RequiresWaiver.HasValue) entity.RequiresWaiver = dto.RequiresWaiver.Value;
            if (dto.AssignedLocationId.HasValue) entity.AssignedLocationId = dto.AssignedLocationId;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // DELETE /api/appointmenttype/{id:int}
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
        {
            var orgId = OrgId;

            var entity = await _db.AppointmentTypes
                .FirstOrDefaultAsync(a => a.Id == id && a.OrganizationId == orgId && !a.IsDeleted, ct);

            if (entity is null) return NotFound();

            entity.IsDeleted = true;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }
    }
}
