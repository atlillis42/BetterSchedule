using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models;
using BetterSchedule.Server.Models.DTOs.Reservation;
using BetterSchedule.Server.Models.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public sealed class ReservationController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        public ReservationController(ApplicationDbContext db) => _db = db;

        private string OrgId => User.GetOrgIdOrThrow();

        // GET /api/reservation?start=yyyy-MM-dd&end=yyyy-MM-dd
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ReservationDto>>> List(
            [FromQuery] DateTimeOffset? start,
            [FromQuery] DateTimeOffset? end,
            CancellationToken ct)
        {
            var orgId = OrgId;

            var q = _db.Reservations
                .AsNoTracking()
                .Where(r => r.OrganizationId == orgId && !r.IsDeleted);

            if (start.HasValue && end.HasValue)
            {
                q = q.Where(r => r.StartTime < end.Value && r.EndTime > start.Value);
            }

            var items = await q
                .OrderBy(r => r.StartTime)
                .Select(ToDto())
                .ToListAsync(ct);

            return Ok(items);
        }

        // GET /api/reservation/{id:int}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<ReservationDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var orgId = OrgId;

            var dto = await _db.Reservations
                .AsNoTracking()
                .Where(r => r.OrganizationId == orgId && !r.IsDeleted && r.Id == id)
                .Select(ToDto())
                .FirstOrDefaultAsync(ct);

            return dto is null ? NotFound() : Ok(dto);
        }

        // POST /api/reservation
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<ActionResult<ReservationDto>> Create([FromBody] CreateReservationDto dto, CancellationToken ct)
        {
            var orgId = OrgId;

            if (dto.StartTime >= dto.EndTime)
                return BadRequest("EndTime must be after StartTime.");

            var entity = new Reservation
            {
                OrganizationId = orgId, 
                ClientId = dto.ClientId,
                ServiceProviderId = dto.ServiceProviderId,
                AppointmentTypeId = dto.AppointmentTypeId,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                LocationId = dto.LocationId,
                PackageAssignmentId = dto.PackageAssignmentId,
                Notes = dto.Notes,
                Status = ReservationStatus.Booked,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = null,
                IsDeleted = false
            };

            _db.Reservations.Add(entity);
            await _db.SaveChangesAsync(ct);

            var read = await _db.Reservations
                .AsNoTracking()
                .Where(r => r.Id == entity.Id)
                .Select(ToDto())
                .FirstAsync(ct);

            return CreatedAtAction(nameof(GetById), new { id = read.Id }, read);
        }

        // PUT /api/reservation/{id:int}
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateReservationDto dto, CancellationToken ct)
        {
            var orgId = OrgId;

            var reservation = await _db.Reservations
                .FirstOrDefaultAsync(r => r.Id == id && r.OrganizationId == orgId && !r.IsDeleted, ct);

            if (reservation is null) return NotFound();

            if (dto.Notes is not null) reservation.Notes = dto.Notes;
            if (dto.LocationId is not null) reservation.LocationId = dto.LocationId;
            if (dto.PackageAssignmentId.HasValue) reservation.PackageAssignmentId = dto.PackageAssignmentId;

            if (!string.IsNullOrWhiteSpace(dto.Status))
            {
                if (!Enum.TryParse<ReservationStatus>(dto.Status, true, out var parsed))
                    return BadRequest($"Unknown status '{dto.Status}'.");
                reservation.Status = parsed;
            }

            var newStart = dto.StartTime ?? reservation.StartTime;
            var newEnd = dto.EndTime ?? reservation.EndTime;
            if (newEnd <= newStart) return BadRequest("EndTime must be after StartTime.");

            if (dto.StartTime.HasValue) reservation.StartTime = dto.StartTime.Value;
            if (dto.EndTime.HasValue) reservation.EndTime = dto.EndTime.Value;

            reservation.UpdatedAt = DateTimeOffset.UtcNow;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // DELETE /api/reservation/{id:int}
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
        {
            var orgId = OrgId;

            var entity = await _db.Reservations
                .FirstOrDefaultAsync(r => r.Id == id && r.OrganizationId == orgId && !r.IsDeleted, ct);

            if (entity is null) return NotFound();

            entity.IsDeleted = true;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // Map entity -> your ReservationDto (status as string)
        private static Expression<Func<Reservation, ReservationDto>> ToDto() => r => new ReservationDto
        {
            Id = r.Id,
            OrganizationId = r.OrganizationId,
            ClientId = r.ClientId,
            ServiceProviderId = r.ServiceProviderId,
            AppointmentTypeId = r.AppointmentTypeId,
            StartTime = r.StartTime,
            EndTime = r.EndTime,
            Status = r.Status.ToString(),
            Notes = r.Notes,
            LocationId = r.LocationId,
            PackageAssignmentId = r.PackageAssignmentId,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt,
            IsDeleted = r.IsDeleted
        };
    }
}
