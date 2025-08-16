using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.Reservation;
using BetterSchedule.Server.Models.DTOs.ReservationParticipant;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Services.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Linq.Expressions;
using static BetterSchedule.Server.Auth.ReservationScopes;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    [ApiController]
    [Route("api/reservation")]
    [Authorize]
    public sealed class ReservationController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly ISchedulingConflictService _conflicts;

        /// <summary>
        /// Initializes a new instance of the <see cref="ReservationController"/> class.
        /// </summary>
        /// <param name="db">Database context for reservation operations.</param>
        /// <param name="conflicts">Service for checking scheduling conflicts.</param>
        public ReservationController(ApplicationDbContext db, ISchedulingConflictService conflicts)
        {
            _db = db;
            _conflicts = conflicts;
        }

        /// <summary>
        /// Lists reservations overlapping the optional time range and visible to the caller.
        /// </summary>
        /// <param name="start">Optional start of the range to filter.</param>
        /// <param name="end">Optional end of the range to filter.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>Collection of reservation DTOs.</returns>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ReservationDto>>> List(
            [FromQuery] DateTimeOffset? start,
            [FromQuery] DateTimeOffset? end,
            CancellationToken ct)
        {
            var items = await _db.Reservations
                .VisibleTo(OrganizationId, UserId, IsManager, IsProvider, IsClient)
                .Overlapping(start, end)
                .OrderBy(r => r.StartTime)
                .Select(ToDto())
                .ToListAsync(ct);

            return Ok(items);
        }

        /// <summary>
        /// Retrieves a reservation by identifier if visible to the caller.
        /// </summary>
        /// <param name="id">The reservation identifier.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>The reservation DTO if found; otherwise <see cref="NotFound"/>.</returns>
        [HttpGet("{id:int}")]
        public async Task<ActionResult<ReservationDto>> GetById(
            [FromRoute] int id, CancellationToken ct)
        {
            var dto = await _db.Reservations
                .VisibleTo(OrganizationId, UserId, IsManager, IsProvider, IsClient)
                .Where(r => r.Id == id)
                .Select(ToDto())
                .FirstOrDefaultAsync(ct);

            return dto is null ? NotFound() : Ok(dto);
        }

        /// <summary>
        /// Creates a new reservation. Allowed for managers and service providers.
        /// </summary>
        /// <param name="dto">Reservation details.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>The created reservation DTO.</returns>
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<ActionResult<ReservationDto>> Create(
            [FromBody] CreateReservationDto dto, CancellationToken ct)
        {
            if (dto.StartTime >= dto.EndTime)
                return BadRequest("EndTime must be after StartTime.");

            var settings = await _db.OrganizationSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.OrganizationId == OrganizationId, ct);
            if (settings is not null)
            {
                var now = DateTimeOffset.UtcNow;
                if (dto.StartTime < now.AddMinutes(settings.MinLeadMinutes))
                    return BadRequest($"Reservations must be created at least {settings.MinLeadMinutes} minutes in advance.");
            }

            var c = await _conflicts.CheckReservationCreateAsync(
                OrganizationId,
                dto.ServiceProviderId,
                dto.StartTime,
                dto.EndTime,
                dto.ResourceId,
                ct);

            if (c.ProviderBlocked || c.ResourceBlocked)
                return Conflict(new { code = "UNAVAILABLE", message = "This time is blocked for the provider or resource." });

            var warnDoubleBook = c.ReservationOverlap && IsProvider;

            var entity = new Reservation
            {
                OrganizationId = OrganizationId,
                ClientId = dto.ClientId,
                ServiceProviderId = dto.ServiceProviderId,
                AppointmentTypeId = dto.AppointmentTypeId,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                ResourceId = dto.ResourceId,
                PackageAssignmentId = dto.PackageAssignmentId,
                Notes = dto.Notes,
                Status = ReservationStatus.Booked,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = null,
                IsDeleted = false
            };

            _db.Reservations.Add(entity);
            await _db.SaveChangesAsync(ct);

            var read = await _db.Reservations.AsNoTracking()
                .Where(r => r.Id == entity.Id)
                .Select(ToDto())
                .FirstAsync(ct);

            if (warnDoubleBook) Response.Headers["X-Warned-Double-Booking"] = "true";
            return CreatedAtAction(nameof(GetById), new { id = read.Id }, read);
        }

        /// <summary>
        /// Updates an existing reservation. Allowed for managers and service providers.
        /// </summary>
        /// <param name="id">The reservation identifier.</param>
        /// <param name="dto">Updated reservation values.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns><see cref="NoContent"/> on success, or an error result.</returns>
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Update(
            [FromRoute] int id, 
            [FromBody] UpdateReservationDto dto,CancellationToken ct, 
            [FromQuery] bool managerOverride = false)
        {
            var reservation = await _db.Reservations
                .FirstOrDefaultAsync(r => r.Id == id && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);
            if (reservation is null) return NotFound();

            var settings = await _db.OrganizationSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.OrganizationId == OrganizationId, ct);
            var now = DateTimeOffset.UtcNow;
            if (settings is not null)
            {
                var cancelWindow = TimeSpan.FromHours(settings.CancelWindowHours);
                if (reservation.StartTime - now < cancelWindow && !(managerOverride && IsManager))
                    return BadRequest($"Reservations cannot be modified within {settings.CancelWindowHours} hours of start time without manager override.");
            }

            // To enforce "Provider can only modify their own," uncomment:
            // if (!ReservationScopes.CanModify(reservation, UserId, IsManager, IsProvider, isClient: false)) return Forbid();

            // Proposed values (client is immutable here by design).
            var newProviderId = dto.ServiceProviderId ?? reservation.ServiceProviderId;
            var newAppointmentTypeId = dto.AppointmentTypeId ?? reservation.AppointmentTypeId;
            var newStart = dto.StartTime ?? reservation.StartTime;
            var newEnd = dto.EndTime ?? reservation.EndTime;
            var newResourceId = dto.ResourceId ?? reservation.ResourceId;

            if (newEnd <= newStart)
                return BadRequest("EndTime must be after StartTime.");

            if (settings is not null && newStart < now.AddMinutes(settings.MinLeadMinutes))
                return BadRequest($"Reservations must be scheduled at least {settings.MinLeadMinutes} minutes in advance.");

            var c = await _conflicts.CheckReservationUpdateAsync(
                id,
                OrganizationId,
                newProviderId,
                newStart,
                newEnd,
                newResourceId,
                ct);

            if (c.ProviderBlocked || c.ResourceBlocked)
                return Conflict(new { code = "UNAVAILABLE", message = "This time is blocked for the provider or resource." });

            var warnDoubleBook = c.ReservationOverlap && IsProvider;

            if (dto.Notes is not null) reservation.Notes = dto.Notes;
            if (dto.ResourceId is not null) reservation.ResourceId = dto.ResourceId;
            if (dto.PackageAssignmentId.HasValue) reservation.PackageAssignmentId = dto.PackageAssignmentId;

            if (!string.IsNullOrWhiteSpace(dto.Status))
            {
                if (!Enum.TryParse<ReservationStatus>(dto.Status, true, out var parsed))
                    return BadRequest($"Unknown status '{dto.Status}'.");
                reservation.Status = parsed;
            }

            reservation.ServiceProviderId = newProviderId;
            reservation.AppointmentTypeId = newAppointmentTypeId;
            reservation.StartTime = newStart;
            reservation.EndTime = newEnd;
            reservation.UpdatedAt = DateTimeOffset.UtcNow;

            await _db.SaveChangesAsync(ct);

            if (warnDoubleBook) Response.Headers["X-Warned-Double-Booking"] = "true";
            return NoContent();
        }

        /// <summary>
        /// Soft deletes a reservation.
        /// </summary>
        /// <param name="id">The reservation identifier.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns><see cref="NoContent"/> on success, or an error result.</returns>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Delete(
            [FromRoute] int id, CancellationToken ct,
            [FromQuery] bool managerOverride = false)
        {
            var entity = await _db.Reservations
                .FirstOrDefaultAsync(r => r.Id == id && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);

            if (entity is null) return NotFound();

            var settings = await _db.OrganizationSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.OrganizationId == OrganizationId, ct);
            if (settings is not null)
            {
                var now = DateTimeOffset.UtcNow;
                var cancelWindow = TimeSpan.FromHours(settings.CancelWindowHours);
                if (entity.StartTime - now < cancelWindow && !(managerOverride && IsManager))
                    return BadRequest($"Reservations cannot be deleted within {settings.CancelWindowHours} hours of start time without manager override.");
            }


            entity.IsDeleted = true;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // Map entity -> ReservationDto (status as string).
        private static Expression<Func<Reservation, ReservationDto>> ToDto() => r => new ReservationDto
        {
            Id = r.Id,
            OrganizationId = r.OrganizationId,
            ClientId = r.ClientId,
            ServiceProviderId = r.ServiceProviderId,
            AppointmentTypeId = r.AppointmentTypeId,
            StartTime = r.StartTime,
            EndTime = r.EndTime,
            ResourceId = r.ResourceId,
            PackageAssignmentId = r.PackageAssignmentId,
            Status = r.Status.ToString(),
            Notes = r.Notes,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt,
            IsDeleted = r.IsDeleted,
            Participants = r.Participants
                .Where(p => !p.IsDeleted)
                .Select(p => new ReservationParticipantDto
                {
                    Id = p.Id,
                    ReservationId = p.ReservationId,
                    UserId = p.UserId ?? string.Empty,
                    GuestName = p.GuestName,
                    GuestPhone = p.GuestPhone,
                    Role = p.Role.ToString(),
                    OrganizationId = p.OrganizationId,
                    IsDeleted = p.IsDeleted
                })
                .ToList()
        };
    }
}
