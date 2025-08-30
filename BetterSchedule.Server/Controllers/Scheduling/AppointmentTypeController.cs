using System;
using System.Linq.Expressions;
using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.AppointmentType;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Services.Errors; // ApiError
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using static BetterSchedule.Server.Auth.AppointmentTypeScopes;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    /// <summary>
    /// CRUD for appointment types within the current organization.
    /// Visibility and modification are governed by <see cref="AppointmentTypeScopes"/>.
    /// </summary>
    [ApiController]
    [Route("api/appointmenttype")]
    [Authorize]
    public sealed class AppointmentTypeController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        public AppointmentTypeController(ApplicationDbContext db) => _db = db;

        /// <summary>Lists appointment types visible to the caller (org-scoped).</summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<AppointmentTypeDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<AppointmentTypeDto>>> List(CancellationToken ct)
        {
            var items = await _db.AppointmentTypes
                .VisibleTo(OrganizationId, UserId, IsManager, IsProvider, IsClient)
                .OrderBy(a => a.Name)
                .Select(ToDto())
                .ToListAsync(ct);

            return Ok(items);
        }

        /// <summary>Retrieves a single appointment type if visible to the caller.</summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(AppointmentTypeDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<AppointmentTypeDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var a = await _db.AppointmentTypes
                .VisibleTo(OrganizationId, UserId, IsManager, IsProvider, IsClient)
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            return a is null ? NotFound() : Ok(ToDto().Compile()(a));
        }

        /// <summary>
        /// Creates a new appointment type. Manager/Provider only.
        /// Validates duration &gt; 0, optional assigned resource exists in org, and name non-empty.
        /// Stamps <c>CreatedByUserId</c> from the authenticated user.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        [ProducesResponseType(typeof(AppointmentTypeDto), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiError), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiError), StatusCodes.Status409Conflict)]
        public async Task<ActionResult<AppointmentTypeDto>> Create([FromBody] CreateAppointmentTypeDto dto, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new ApiError("VALIDATION_ERROR", "Name is required."));

            if (dto.Duration <= TimeSpan.Zero)
                return BadRequest(new ApiError("VALIDATION_ERROR", "Duration must be greater than zero."));

            if (dto.Price < 0)
                return BadRequest(new ApiError("VALIDATION_ERROR", "Price cannot be negative."));

            if (dto.AssignedResourceId is not null)
            {
                var resourceExistsInOrg = await _db.CalendarResources
                    .AnyAsync(r => r.Id == dto.AssignedResourceId && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);

                if (!resourceExistsInOrg)
                    return BadRequest(new ApiError("VALIDATION_ERROR", "Assigned resource does not exist in your organization."));
            }

            // Case-insensitive uniqueness within org (aligned with DB collation)
            var normalized = dto.Name.Trim().ToUpperInvariant();
            var exists = await _db.AppointmentTypes
                .AnyAsync(a => a.OrganizationId == OrganizationId && a.Name.ToUpper() == normalized, ct);
            if (exists)
                return Conflict(new ApiError("NAME_CONFLICT", "An appointment type with this name already exists in this organization."));

            var entity = new AppointmentType
            {
                OrganizationId = OrganizationId,
                Name = dto.Name.Trim(),
                Duration = dto.Duration,
                Price = dto.Price,
                Description = dto.Description,
                CreatedByUserId = UserId!, // stamped from auth
                AssignedResourceId = dto.AssignedResourceId,
                IsPublic = dto.IsPublic,
                RequiresWaiver = dto.RequiresWaiver,
                IsDeleted = false
            };

            _db.AppointmentTypes.Add(entity);

            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                return Conflict(new ApiError("NAME_CONFLICT", "An appointment type with this name already exists in this organization."));
            }

            var read = ToDto().Compile()(entity);
            return CreatedAtAction(nameof(GetById), new { id = read.Id }, read);
        }

        /// <summary>
        /// Updates an existing appointment type. Manager/Provider only.
        /// Validates name/uniqueness, duration &gt; 0, and assigned resource existence (if provided).
        /// Supports explicit unassignment via <c>clearAssignedResource</c>.
        /// </summary>
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ApiError), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiError), StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateAppointmentTypeDto dto, CancellationToken ct)
        {
            var a = await _db.AppointmentTypes
                .FirstOrDefaultAsync(x => x.Id == id && x.OrganizationId == OrganizationId && !x.IsDeleted, ct);

            if (a is null) return NotFound();
            if (!AppointmentTypeScopes.CanModify(a, UserId, IsManager, IsProvider, IsClient)) return Forbid();

            if (dto.Name is not null)
            {
                var trimmed = dto.Name.Trim();
                if (string.IsNullOrWhiteSpace(trimmed))
                    return BadRequest(new ApiError("VALIDATION_ERROR", "Name cannot be empty."));

                var normalized = trimmed.ToUpperInvariant();
                var exists = await _db.AppointmentTypes
                    .AnyAsync(x => x.OrganizationId == OrganizationId && x.Id != id && x.Name.ToUpper() == normalized, ct);
                if (exists)
                    return Conflict(new ApiError("NAME_CONFLICT", "A different appointment type with this name already exists in this organization."));

                a.Name = trimmed;
            }

            if (dto.Duration.HasValue)
            {
                if (dto.Duration.Value <= TimeSpan.Zero)
                    return BadRequest(new ApiError("VALIDATION_ERROR", "Duration must be greater than zero."));
                a.Duration = dto.Duration.Value;
            }

            if (dto.Price.HasValue)
            {
                if (dto.Price.Value < 0)
                    return BadRequest(new ApiError("VALIDATION_ERROR", "Price cannot be negative."));
                a.Price = dto.Price.Value;
            }

            if (dto.Description is not null) a.Description = dto.Description;
            if (dto.IsPublic.HasValue) a.IsPublic = dto.IsPublic.Value;
            if (dto.RequiresWaiver.HasValue) a.RequiresWaiver = dto.RequiresWaiver.Value;

            // Option A: clear flag with precedence and conflict checks
            if (dto.ClearAssignedResource == true && dto.AssignedResourceId.HasValue)
            {
                return BadRequest(new ApiError("VALIDATION_ERROR", "Provide either clearAssignedResource or assignedResourceId, not both."));
            }

            if (dto.ClearAssignedResource == true)
            {
                a.AssignedResourceId = null;
            }
            else if (dto.AssignedResourceId.HasValue)
            {
                var targetResourceId = dto.AssignedResourceId.Value;
                var resourceExistsInOrg = await _db.CalendarResources
                    .AnyAsync(r => r.Id == targetResourceId && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);

                if (!resourceExistsInOrg)
                    return BadRequest(new ApiError("VALIDATION_ERROR", "Assigned resource does not exist in your organization."));

                a.AssignedResourceId = targetResourceId;
            }

            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                return Conflict(new ApiError("NAME_CONFLICT", "An appointment type with this name already exists in this organization."));
            }

            return NoContent();
        }

        /// <summary>Soft-deletes an appointment type. Manager/Provider only.</summary>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
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

        /// <summary>Projection from <see cref="AppointmentType"/> to <see cref="AppointmentTypeDto"/>.</summary>
        private static Expression<Func<AppointmentType, AppointmentTypeDto>> ToDto() => a => new AppointmentTypeDto
        {
            Id = a.Id,
            Name = a.Name,
            Duration = a.Duration,
            Price = a.Price,
            Description = a.Description,
            CreatedByUserId = a.CreatedByUserId,
            CreatedByUserName = null, // optional: hydrate display name via join if needed
            AssignedResourceId = a.AssignedResourceId,
            AssignedResourceName = null, // optional: hydrate resource name via join if needed
            IsPublic = a.IsPublic,
            RequiresWaiver = a.RequiresWaiver,
            IsDeleted = a.IsDeleted,
            OrganizationId = a.OrganizationId
        };

        private static bool IsUniqueViolation(DbUpdateException ex)
            => ex.InnerException is SqlException sql && (sql.Number == 2601 || sql.Number == 2627);
    }
}
