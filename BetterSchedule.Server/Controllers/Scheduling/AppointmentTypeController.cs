using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Common;
using BetterSchedule.Server.Models.DTOs.AppointmentType;
using BetterSchedule.Server.Models.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AppointmentTypeController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;

        public AppointmentTypeController(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResult<AppointmentTypeDto>>> GetFiltered(
            [FromQuery] string? createdByUserId,
            [FromQuery] string organizationId,
            [FromQuery] bool? isPublic,
            [FromQuery] bool? requiresWaiver,
            [FromQuery] string? name,
            [FromQuery] int? assignedLocationId, 
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20
        )
        {
            var query = _dbContext.AppointmentTypes
                .AsNoTracking()
                .Include(t => t.CreatedByUser)
                .Include(t => t.AssignedLocation)
                .Where(t => !t.IsDeleted && t.OrganizationId == organizationId);

            if (!string.IsNullOrWhiteSpace(createdByUserId))
                query = query.Where(t => t.CreatedByUserId == createdByUserId);

            if (isPublic.HasValue)
                query = query.Where(t => t.IsPublic == isPublic);

            if (requiresWaiver.HasValue)
                query = query.Where(t => t.RequiresWaiver == requiresWaiver);

            if (!string.IsNullOrWhiteSpace(name))
                query = query.Where(t => t.Name.Contains(name));

            if (assignedLocationId.HasValue)
                query = query.Where(t => t.AssignedLocationId == assignedLocationId.Value);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(t => t.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new PagedResult<AppointmentTypeDto>
            {
                Items = items.Select(ToDto).ToList(),
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount
            });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<AppointmentTypeDto>> GetById(int id)
        {
            var t = await _dbContext.AppointmentTypes
                .Include(x => x.CreatedByUser)
                .Include(x => x.AssignedLocation)
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

            if (t == null) return NotFound();
            return Ok(ToDto(t));
        }

        [HttpPost]
        public async Task<ActionResult<AppointmentTypeDto>> Create([FromBody] CreateAppointmentTypeDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var type = new AppointmentType
            {
                Name = dto.Name,
                OrganizationId = dto.OrganizationId,
                Duration = dto.Duration,
                Price = dto.Price,
                Description = dto.Description,
                CreatedByUserId = dto.CreatedByUserId,
                AssignedLocationId = dto.AssignedLocationId,
                IsPublic = dto.IsPublic,
                RequiresWaiver = dto.RequiresWaiver,
                IsDeleted = false
            };
            _dbContext.AppointmentTypes.Add(type);
            await _dbContext.SaveChangesAsync();

            // Fetch with navigation for DTO output
            var created = await _dbContext.AppointmentTypes
                .Include(x => x.CreatedByUser)
                .Include(x => x.AssignedLocation)
                .FirstOrDefaultAsync(x => x.Id == type.Id);

            return CreatedAtAction(nameof(GetById), new { id = type.Id }, ToDto(created!));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateAppointmentTypeDto dto)
        {
            var type = await _dbContext.AppointmentTypes.FindAsync(id);
            if (type == null || type.IsDeleted) return NotFound();

            if (dto.Name != null) type.Name = dto.Name;
            if (dto.Duration.HasValue) type.Duration = dto.Duration.Value;
            if (dto.Price.HasValue) type.Price = dto.Price.Value;
            if (dto.Description != null) type.Description = dto.Description;
            if (dto.IsPublic.HasValue) type.IsPublic = dto.IsPublic.Value;
            if (dto.RequiresWaiver.HasValue) type.RequiresWaiver = dto.RequiresWaiver.Value;
            if (dto.AssignedLocationId != null) type.AssignedLocationId = dto.AssignedLocationId;

            await _dbContext.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> SoftDelete(int id)
        {
            var type = await _dbContext.AppointmentTypes.FindAsync(id);
            if (type == null || type.IsDeleted) return NotFound();

            type.IsDeleted = true;
            await _dbContext.SaveChangesAsync();
            return NoContent();
        }

        private static AppointmentTypeDto ToDto(AppointmentType t) => new AppointmentTypeDto
        {
            Id = t.Id,
            Name = t.Name,
            Duration = t.Duration,
            Price = t.Price,
            Description = t.Description,
            CreatedByUserId = t.CreatedByUserId,
            CreatedByUserName = t.CreatedByUser?.UserName, 
            AssignedLocationId = t.AssignedLocationId,
            AssignedLocationName = t.AssignedLocation?.Name, 
            IsPublic = t.IsPublic,
            RequiresWaiver = t.RequiresWaiver,
            IsDeleted = t.IsDeleted,
            OrganizationId = t.OrganizationId
        };
    }
}
