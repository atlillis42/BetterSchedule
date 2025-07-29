using BetterSchedule.Server.Data;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs;
using BetterSchedule.Server.Models.DTOs.AppointmentType;
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

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ReservationDto>>> GetAll()
        {
            var reservations = await _dbContext.Reservations
                .Include(r => r.Participants)
                .Where(r => !r.IsDeleted)
                .ToListAsync();

            return Ok(reservations.Select(ToDto));
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
