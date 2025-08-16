using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.ProviderAvailability;
using BetterSchedule.Server.Models.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    [ApiController]
    [Route("api/provider-availability")]
    [Authorize]
    public sealed class ProviderAvailabilityController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;

        public ProviderAvailabilityController(ApplicationDbContext db)
        {
            _db = db;
        }

        [HttpGet("{providerId}")]
        public async Task<ActionResult<IEnumerable<ProviderAvailabilityDto>>> List(
            [FromRoute] string providerId,
            CancellationToken ct)
        {
            var items = await _db.ProviderAvailabilities
                .VisibleTo(OrganizationId, UserId, IsManager, IsProvider)
                .Where(pa => pa.ProviderId == providerId)
                .OrderBy(pa => pa.DayOfWeek)
                .ThenBy(pa => pa.StartTime)
                .Select(pa => new ProviderAvailabilityDto
                {
                    Id = pa.Id,
                    OrganizationId = pa.OrganizationId,
                    ProviderId = pa.ProviderId,
                    DayOfWeek = pa.DayOfWeek,
                    StartTime = pa.StartTime,
                    EndTime = pa.EndTime,
                    IsDeleted = pa.IsDeleted
                })
                .ToListAsync(ct);

            return Ok(items);
        }

        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<ActionResult<ProviderAvailabilityDto>> Create(
            [FromBody] CreateProviderAvailabilityDto dto,
            CancellationToken ct)
        {
            if (!IsManager && IsProvider && dto.ProviderId != UserId)
                return Forbid();

            if (dto.StartTime >= dto.EndTime)
                return BadRequest("EndTime must be after StartTime.");

            var entity = new ProviderAvailability
            {
                OrganizationId = OrganizationId,
                ProviderId = dto.ProviderId,
                DayOfWeek = dto.DayOfWeek,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                IsDeleted = false
            };

            _db.ProviderAvailabilities.Add(entity);
            await _db.SaveChangesAsync(ct);

            var read = await _db.ProviderAvailabilities.AsNoTracking()
                .Where(pa => pa.Id == entity.Id)
                .Select(pa => new ProviderAvailabilityDto
                {
                    Id = pa.Id,
                    OrganizationId = pa.OrganizationId,
                    ProviderId = pa.ProviderId,
                    DayOfWeek = pa.DayOfWeek,
                    StartTime = pa.StartTime,
                    EndTime = pa.EndTime,
                    IsDeleted = pa.IsDeleted
                })
                .FirstAsync(ct);

            return CreatedAtAction(nameof(List), new { providerId = read.ProviderId }, read);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Update(
            [FromRoute] int id,
            [FromBody] UpdateProviderAvailabilityDto dto,
            CancellationToken ct)
        {
            var entity = await _db.ProviderAvailabilities
                .FirstOrDefaultAsync(pa => pa.Id == id && pa.OrganizationId == OrganizationId && !pa.IsDeleted, ct);
            if (entity is null) return NotFound();
            if (!ProviderAvailabilityScopes.CanModify(entity, UserId, IsManager, IsProvider)) return Forbid();

            if (dto.StartTime >= dto.EndTime)
                return BadRequest("EndTime must be after StartTime.");

            entity.DayOfWeek = dto.DayOfWeek;
            entity.StartTime = dto.StartTime;
            entity.EndTime = dto.EndTime;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Delete(
            [FromRoute] int id,
            CancellationToken ct)
        {
            var entity = await _db.ProviderAvailabilities
                .FirstOrDefaultAsync(pa => pa.Id == id && pa.OrganizationId == OrganizationId && !pa.IsDeleted, ct);
            if (entity is null) return NotFound();
            if (!ProviderAvailabilityScopes.CanModify(entity, UserId, IsManager, IsProvider)) return Forbid();

            entity.IsDeleted = true;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        [HttpPut("bulk")]
        [Authorize(Roles = "Manager")]
        public async Task<IActionResult> BulkUpsert(
            [FromBody] IEnumerable<UpsertProviderAvailabilityDto> items,
            CancellationToken ct)
        {
            foreach (var dto in items)
            {
                if (dto.StartTime >= dto.EndTime)
                    return BadRequest("EndTime must be after StartTime.");

                ProviderAvailability? entity = null;
                if (dto.Id.HasValue)
                {
                    entity = await _db.ProviderAvailabilities
                        .FirstOrDefaultAsync(pa => pa.Id == dto.Id.Value && pa.OrganizationId == OrganizationId && !pa.IsDeleted, ct);
                }

                if (entity is null)
                {
                    entity = new ProviderAvailability
                    {
                        OrganizationId = OrganizationId
                    };
                    _db.ProviderAvailabilities.Add(entity);
                }

                entity.ProviderId = dto.ProviderId;
                entity.DayOfWeek = dto.DayOfWeek;
                entity.StartTime = dto.StartTime;
                entity.EndTime = dto.EndTime;
                entity.IsDeleted = false;
            }

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }
    }
}