using BetterSchedule.Server.Data;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs;
using BetterSchedule.Server.Models.DTOs.AppointmentType;
using BetterSchedule.Server.Models.DTOs.Common;
using BetterSchedule.Server.Models.DTOs.Reservation;
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
    public class ReservationController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;

        public ReservationController(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Get reservations filtered by client/provider, date range, appointment type, status.
        /// Example: /api/reservation?clientId=...&providerId=...&start=2025-07-01&end=2025-07-31&status=Booked
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<PagedResult<ReservationDto>>> GetFiltered(
            [FromQuery] string? clientId,
            [FromQuery] string? providerId,
            [FromQuery] int? appointmentTypeId,
            [FromQuery] string? status,
            [FromQuery] DateTime? start,
            [FromQuery] DateTime? end,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20
        )
        {
            var query = _dbContext.Reservations
                .AsNoTracking()
                .Where(r => !r.IsDeleted);

            if (!string.IsNullOrWhiteSpace(clientId))
                query = query.Where(r => r.ClientId == clientId);

            if (!string.IsNullOrWhiteSpace(providerId))
                query = query.Where(r => r.ServiceProviderId == providerId);

            if (appointmentTypeId.HasValue)
                query = query.Where(r => r.AppointmentTypeId == appointmentTypeId);

            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ReservationStatus>(status, true, out var parsedStatus))
                query = query.Where(r => r.Status == parsedStatus);

            if (start.HasValue)
                query = query.Where(r => r.EndTime >= start.Value);

            if (end.HasValue)
                query = query.Where(r => r.StartTime <= end.Value);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(r => r.StartTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Include(r => r.Participants)
                .ToListAsync();

            return Ok(new PagedResult<ReservationDto>
            {
                Items = items.Select(ToDto).ToList(),
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount
            });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ReservationDto>> GetById(int id)
        {
            var r = await _dbContext.Reservations
                .Include(res => res.Participants)
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

            if (r == null) return NotFound();
            return Ok(ToDto(r));
        }

        [HttpPost]
        public async Task<ActionResult<ReservationDto>> Create([FromBody] CreateReservationDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var reservation = new Reservation
            {
                ClientId = dto.ClientId,
                ServiceProviderId = dto.ServiceProviderId,
                AppointmentTypeId = dto.AppointmentTypeId,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                LocationId = dto.LocationId,
                PackageAssignmentId = dto.PackageAssignmentId,
                Notes = dto.Notes,
                Status = ReservationStatus.Booked,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.Reservations.Add(reservation);
            await _dbContext.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = reservation.Id }, ToDto(reservation));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateReservationDto dto)
        {
            var reservation = await _dbContext.Reservations.FindAsync(id);
            if (reservation == null || reservation.IsDeleted) return NotFound();

            if (dto.Notes != null) reservation.Notes = dto.Notes;
            if (dto.StartTime.HasValue) reservation.StartTime = dto.StartTime.Value;
            if (dto.EndTime.HasValue) reservation.EndTime = dto.EndTime.Value;
            if (dto.Status != null && Enum.TryParse<ReservationStatus>(dto.Status, out var status))
                reservation.Status = status;
            if (dto.LocationId != null) reservation.LocationId = dto.LocationId;
            if (dto.PackageAssignmentId.HasValue) reservation.PackageAssignmentId = dto.PackageAssignmentId.Value;

            reservation.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> SoftDelete(int id)
        {
            var reservation = await _dbContext.Reservations.FindAsync(id);
            if (reservation == null || reservation.IsDeleted) return NotFound();

            reservation.IsDeleted = true;
            await _dbContext.SaveChangesAsync();
            return NoContent();
        }

        private static ReservationDto ToDto(Reservation r) => new ReservationDto
        {
            Id = r.Id,
            ClientId = r.ClientId,
            ServiceProviderId = r.ServiceProviderId,
            AppointmentTypeId = r.AppointmentTypeId,
            StartTime = r.StartTime,
            EndTime = r.EndTime,
            LocationId = r.LocationId,
            PackageAssignmentId = r.PackageAssignmentId,
            Status = r.Status.ToString(),
            Notes = r.Notes,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt,
            IsDeleted = r.IsDeleted
        };
    }
}
