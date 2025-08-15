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

        /// <summary>
        /// Initializes a new instance of the <see cref="AppointmentTypeController"/> class.
        /// </summary>
        /// <param name="db">Database context used for appointment type queries.</param>
        public AppointmentTypeController(ApplicationDbContext db) => _db = db;

        /// <summary>
        /// Lists appointment types visible to the current caller.
        /// Manager sees all types, providers see public and their own, and clients see only public types.
        /// </summary>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>Collection of appointment type DTOs.</returns>
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

        /// <summary>
        /// Retrieves a specific appointment type by identifier using the same visibility rules as <see cref="List"/>.
        /// </summary>
        /// <param name="id">The appointment type identifier.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>The appointment type DTO if found; otherwise <see cref="NotFound"/>.</returns>
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

        /// <summary>
        /// Creates a new appointment type. Managers can create for the organization and providers can create types for themselves.
        /// </summary>
        /// <param name="dto">Values for the new appointment type.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>The created appointment type DTO.</returns>
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

        /// <summary>
        /// Updates an existing appointment type. Managers may update any type while providers may update types they own.
        /// </summary>
        /// <param name="id">The appointment type identifier.</param>
        /// <param name="dto">Updated values for the appointment type.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns><see cref="NoContent"/> on success, or an error result.</returns>
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

        /// <summary>
        /// Soft deletes an appointment type. Managers may delete any type while providers may delete types they own.
        /// </summary>
        /// <param name="id">The appointment type identifier.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns><see cref="NoContent"/> on success, or an error result.</returns>
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
