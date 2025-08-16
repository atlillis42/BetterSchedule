using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.ReservationParticipant;
using BetterSchedule.Server.Models.Identity;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Services.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    [ApiController]
    [Route("api/reservations/{reservationId:int}/participants")]
    [Authorize]
    public sealed class ReservationParticipantController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ISchedulingConflictService _conflicts;

        public ReservationParticipantController(
            ApplicationDbContext db,
            UserManager<ApplicationUser> userManager,
            ISchedulingConflictService conflicts)
        {
            _db = db;
            _userManager = userManager;
            _conflicts = conflicts;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ReservationParticipantDto>>> List(
            [FromRoute] int reservationId, CancellationToken ct)
        {
            var reservation = await _db.Reservations
                .VisibleTo(OrganizationId, UserId, IsManager, IsProvider, IsClient)
                .FirstOrDefaultAsync(r => r.Id == reservationId, ct);
            if (reservation is null) return NotFound();

            var items = await _db.ReservationParticipants.AsNoTracking()
                .Where(rp => rp.ReservationId == reservationId &&
                             rp.OrganizationId == OrganizationId &&
                             !rp.IsDeleted)
                .Select(rp => new ReservationParticipantDto
                {
                    Id = rp.Id,
                    ReservationId = rp.ReservationId,
                    UserId = rp.UserId ?? string.Empty,
                    GuestName = rp.GuestName,
                    GuestPhone = rp.GuestPhone,
                    Role = rp.Role.ToString(),
                    OrganizationId = rp.OrganizationId,
                    IsDeleted = rp.IsDeleted
                })
                .ToListAsync(ct);

            return Ok(items);
        }

        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<ActionResult<ReservationParticipantDto>> Add(
            [FromRoute] int reservationId,
            [FromBody] AddReservationParticipantDto dto,
            CancellationToken ct)
        {
            var reservation = await _db.Reservations
               .FirstOrDefaultAsync(r => r.Id == reservationId && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);
            if (reservation is null) return NotFound();
            if (!ReservationScopes.CanModify(reservation, UserId, IsManager, IsProvider, isClient: false)) return Forbid();

            if (!Enum.TryParse<ReservationParticipantRole>(dto.Role, true, out var role))
                return BadRequest($"Unknown role '{dto.Role}'.");

            // Validate role-specific payload
            if (role == ReservationParticipantRole.Guest)
            {
                if (!string.IsNullOrWhiteSpace(dto.UserId))
                    return BadRequest("Guest must not specify UserId.");
                if (string.IsNullOrWhiteSpace(dto.GuestName))
                    return BadRequest("GuestName is required for Guest participants.");
            }
            else
            {
                if (string.IsNullOrWhiteSpace(dto.UserId))
                    return BadRequest("UserId is required for Client/ServiceProvider participants.");

                var user = await _db.Users.FirstOrDefaultAsync(
                    u => u.Id == dto.UserId && u.OrganizationId == reservation.OrganizationId, ct);
                if (user is null) return BadRequest("User must belong to reservation organization.");

                // Enforce application role based on participant role
                if (!await _userManager.IsInRoleAsync(user, role.ToString()))
                    return BadRequest($"User is not a {role}.");

                var exists = await _db.ReservationParticipants.AnyAsync(
                    rp => rp.ReservationId == reservationId &&
                          rp.UserId == dto.UserId &&
                          !rp.IsDeleted, ct);
                if (exists) return Conflict("Participant already exists.");

                // Prevent duplicating primaries
                if (role == ReservationParticipantRole.ServiceProvider && reservation.ServiceProviderId == dto.UserId)
                    return Conflict("Already the primary provider for this reservation.");
                if (role == ReservationParticipantRole.Client && reservation.ClientId == dto.UserId)
                    return Conflict("Already the primary client for this reservation.");
            }

            var entity = new ReservationParticipant
            {
                ReservationId = reservationId,
                UserId = role == ReservationParticipantRole.Guest ? null : dto.UserId,
                GuestName = role == ReservationParticipantRole.Guest ? dto.GuestName : null,
                GuestPhone = role == ReservationParticipantRole.Guest ? dto.GuestPhone : null,
                Role = role,
                OrganizationId = reservation.OrganizationId,
                IsDeleted = false
            };

            _db.ReservationParticipants.Add(entity);

            // Conflict checks for service provider participants
            if (role == ReservationParticipantRole.ServiceProvider)
            {
                var c = await _conflicts.CheckReservationCreateAsync(
                    OrganizationId,
                    dto.UserId!,
                    reservation.StartTime,
                    reservation.EndTime,
                    reservation.ResourceId,
                    ct);

                if (c.ProviderBlocked || c.ResourceBlocked)
                    return Conflict(new { code = "UNAVAILABLE", message = "This time is blocked for the provider or resource." });

                if (c.ReservationOverlap)
                    Response.Headers["X-Warned-Double-Booking"] = "true";
            }

            await _db.SaveChangesAsync(ct);

            var result = new ReservationParticipantDto
            {
                Id = entity.Id,
                ReservationId = entity.ReservationId,
                UserId = entity.UserId ?? string.Empty,
                GuestName = entity.GuestName,
                GuestPhone = entity.GuestPhone,
                Role = entity.Role.ToString(),
                OrganizationId = entity.OrganizationId,
                IsDeleted = entity.IsDeleted
            };

            return CreatedAtAction(nameof(List), new { reservationId }, result);
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Remove(
            [FromRoute] int reservationId,
            [FromRoute] int id,
            CancellationToken ct)
        {
            var reservation = await _db.Reservations
                .FirstOrDefaultAsync(r => r.Id == reservationId && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);
            if (reservation is null) return NotFound();
            if (!ReservationScopes.CanModify(reservation, UserId, IsManager, IsProvider, isClient: false)) return Forbid();

            var participant = await _db.ReservationParticipants
                .FirstOrDefaultAsync(rp => rp.Id == id &&
                                           rp.ReservationId == reservationId &&
                                           rp.OrganizationId == OrganizationId &&
                                           !rp.IsDeleted, ct);
            if (participant is null) return NotFound();

            // Count remaining non-deleted participants excluding this row
            var counts = await _db.ReservationParticipants
                .Where(rp => rp.ReservationId == reservationId && !rp.IsDeleted && rp.Id != id)
                .GroupBy(rp => rp.Role)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count, ct);

            counts.TryGetValue(ReservationParticipantRole.Client, out var clientCount);
            counts.TryGetValue(ReservationParticipantRole.ServiceProvider, out var providerCount);

            // Include primaries from Reservation
            if (!string.IsNullOrEmpty(reservation.ClientId)) clientCount++;
            if (!string.IsNullOrEmpty(reservation.ServiceProviderId)) providerCount++;

            if (clientCount < 1 || providerCount < 1)
                return BadRequest("Reservation must have at least one client and one provider.");

            participant.IsDeleted = true;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }
    }
}
