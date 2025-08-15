using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.AppointmentType;
using BetterSchedule.Server.Models.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static BetterSchedule.Server.Auth.AppointmentTypeScopes;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    [ApiController]
    [Route("api/appointmenttype")]
    [Authorize]
    public sealed class AppointmentTypeController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        public AppointmentTypeController(ApplicationDbContext db) => _db = db;

        // GET /api/appointmenttype
        // Visibility: Manager → all; Provider → public + own; Client → public only.
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AppointmentTypeDto>>> List(CancellationToken ct)
        {
            var items = await _db.AppointmentTypes
                .VisibleTo(OrganizationId, UserId, IsManager, IsProvider, IsClient)
                .OrderBy(a => a.Name)
                .Select(a => new AppointmentTypeDto
                {
                    Id = a.Id,
                    Name = a.Name,
                    Duration = a.Duration,
                    Price = a.Price,
                    Description = a.Description,
                    CreatedByUserId = a.CreatedByUserId,
                    CreatedByUserName = null,           // add Include if you want this
                    AssignedResourceId = a.AssignedResourceId,
                    AssignedResourceName = null,        // add join if you want this
                    IsPublic = a.IsPublic,
                    RequiresWaiver = a.RequiresWaiver,
                    IsDeleted = a.IsDeleted,
                    OrganizationId = a.OrganizationId
                })
                .ToListAsync(ct);

            return Ok(items);
        }

        // GET /api/appointmenttype/{id}
        // Same visibility rules as List().
        [HttpGet("{id:int}")]
        public async Task<ActionResult<AppointmentTypeDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var a = await _db.AppointmentTypes
                .VisibleTo(OrganizationId, UserId, IsManager, IsProvider, IsClient)
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            if (a is null) return NotFound();

            return Ok(new AppointmentTypeDto
            {
                Id = a.Id,
                Name = a.Name,
                Duration = a.Duration,
                Price = a.Price,
                Description = a.Description,
                CreatedByUserId = a.CreatedByUserId,
                CreatedByUserName = null,
                AssignedResourceId = a.AssignedResourceId,
                AssignedResourceName = null,
                IsPublic = a.IsPublic,
                RequiresWaiver = a.RequiresWaiver,
                IsDeleted = a.IsDeleted,
                OrganizationId = a.OrganizationId
            });
        }

        // POST /api/appointmenttype
        // Manager: can create for org; Provider: can create for themselves (owns the type).
        // NOTE: We ignore any incoming CreatedByUserId/OrganizationId and set from claims.
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<ActionResult<AppointmentTypeDto>> Create([FromBody] CreateAppointmentTypeDto dto, CancellationToken ct)
        {
            if (dto.Duration <= TimeSpan.Zero)
                return BadRequest("Duration must be greater than zero.");

            var entity = new AppointmentType
            {
                OrganizationId = OrganizationId,       // stamp org
                Name = dto.Name,
                Duration = dto.Duration,
                Price = dto.Price,
                Description = dto.Description,
                CreatedByUserId = UserId!,             // owner = caller
                AssignedResourceId = dto.AssignedResourceId,
                IsPublic = dto.IsPublic,
                RequiresWaiver = dto.RequiresWaiver,
                IsDeleted = false
            };

            _db.AppointmentTypes.Add(entity);
            await _db.SaveChangesAsync(ct);

            var read = new AppointmentTypeDto
            {
                Id = entity.Id,
                Name = entity.Name,
                Duration = entity.Duration,
                Price = entity.Price,
                Description = entity.Description,
                CreatedByUserId = entity.CreatedByUserId,
                CreatedByUserName = null,
                AssignedResourceId = entity.AssignedResourceId,
                AssignedResourceName = null,
                IsPublic = entity.IsPublic,
                RequiresWaiver = entity.RequiresWaiver,
                IsDeleted = entity.IsDeleted,
                OrganizationId = entity.OrganizationId
            };

            return CreatedAtAction(nameof(GetById), new { id = read.Id }, read);
        }

        // PUT /api/appointmenttype/{id}
        // Manager: can update any; Provider: only if they own it (CreatedByUserId == caller).
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateAppointmentTypeDto dto, CancellationToken ct)
        {
            var a = await _db.AppointmentTypes
                .FirstOrDefaultAsync(x => x.Id == id && x.OrganizationId == OrganizationId && !x.IsDeleted, ct);

            if (a is null) return NotFound();
            if (!AppointmentTypeScopes.CanModify(a, UserId, IsManager, IsProvider, IsClient)) return Forbid();

            if (dto.Name is not null) a.Name = dto.Name;
            if (dto.Duration.HasValue)
            {
                if (dto.Duration.Value <= TimeSpan.Zero) return BadRequest("Duration must be greater than zero.");
                a.Duration = dto.Duration.Value;
            }
            if (dto.Price.HasValue) a.Price = dto.Price.Value;
            if (dto.Description is not null) a.Description = dto.Description;
            if (dto.IsPublic.HasValue) a.IsPublic = dto.IsPublic.Value;
            if (dto.RequiresWaiver.HasValue) a.RequiresWaiver = dto.RequiresWaiver.Value;
            if (dto.AssignedResourceId.HasValue) a.AssignedResourceId = dto.AssignedResourceId;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // DELETE /api/appointmenttype/{id}
        // Manager: can delete any; Provider: only if they own it.
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
        {
            var a = await _db.AppointmentTypes
                .FirstOrDefaultAsync(x => x.Id == id && x.OrganizationId == OrganizationId && !x.IsDeleted, ct);

            if (a is null) return NotFound();
            if (!AppointmentTypeScopes.CanModify(a, UserId, IsManager, IsProvider, IsClient)) return Forbid();

            a.IsDeleted = true;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }
    }
}
