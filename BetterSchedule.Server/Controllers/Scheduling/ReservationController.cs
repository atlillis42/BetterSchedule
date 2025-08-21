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
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<ActionResult<ReservationDto>> Create(
            [FromBody] CreateReservationDto dto,
            [FromQuery] CancellationToken ct,
            bool overrideAvailability = false
            )
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

            // Enforce availability unless properly overridden
            if (c.OutsideProviderAvailability)
            {
                var canOverride =
                    (IsManager && overrideAvailability) ||
                    (IsProvider && overrideAvailability && dto.ServiceProviderId == UserId);

                if (!canOverride)
                    return Conflict(new { code = "OUTSIDE_AVAILABILITY", message = "This time is outside provider availability." });
            }

            if (c.ProviderBlocked || c.ResourceBlocked)
                return Conflict(new { code = "UNAVAILABLE", message = "This time is blocked by the provider or resource." });

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
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Update(
            [FromRoute] int id,
            [FromBody] UpdateReservationDto dto,
            [FromQuery] CancellationToken ct,
            bool managerOverride = false,
            bool overrideAvailability = false
            )
        {
            var reservation = await _db.Reservations
                .FirstOrDefaultAsync(r => r.Id == id && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);
            if (reservation is null) return NotFound();

            // Safeguard: only managers or the owning provider may modify (including cancel).
            if (!ReservationScopes.CanModify(reservation, UserId, IsManager, IsProvider, isClient: false))
                return Forbid();

            var settings = await _db.OrganizationSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.OrganizationId == OrganizationId, ct);

            var now = DateTimeOffset.UtcNow;

            // Determine whether this is a "status-only" change
            var isStatusProvided = !string.IsNullOrWhiteSpace(dto.Status);
            ReservationStatus? parsedStatus = null;
            if (isStatusProvided)
            {
                if (!Enum.TryParse<ReservationStatus>(dto.Status, true, out var sParsed))
                    return BadRequest($"Unknown status '{dto.Status}'.");
                parsedStatus = sParsed;
            }

            var isOnlyStatusChange =
                isStatusProvided &&
                dto.StartTime is null &&
                dto.EndTime is null &&
                dto.ResourceId is null &&
                dto.ServiceProviderId is null &&
                dto.AppointmentTypeId is null &&
                !dto.PackageAssignmentId.HasValue;

            // Idempotent no-op: status already set and no notes change
            if (isOnlyStatusChange && parsedStatus == reservation.Status && dto.Notes is null)
                return NoContent();

            // Compute "effective" values for non-status edits
            var newProviderId = dto.ServiceProviderId ?? reservation.ServiceProviderId;
            var newAppointmentTypeId = dto.AppointmentTypeId ?? reservation.AppointmentTypeId;
            var newStart = dto.StartTime ?? reservation.StartTime;
            var newEnd = dto.EndTime ?? reservation.EndTime;
            var newResourceId = dto.ResourceId ?? reservation.ResourceId;

            // For non-status edits, enforce temporal guards
            if (!isOnlyStatusChange)
            {
                if (newEnd <= newStart)
                    return BadRequest("EndTime must be after StartTime.");

                if (settings is not null && newStart < now.AddMinutes(settings.MinLeadMinutes))
                    return BadRequest($"Reservations must be scheduled at least {settings.MinLeadMinutes} minutes in advance.");
            }

            // Cancel-window handling + provider policy for status-only Canceled
            if (settings is not null)
            {
                var cancelWindow = TimeSpan.FromHours(settings.CancelWindowHours);
                var insideCancelWindow = reservation.StartTime - now < cancelWindow;

                if (isOnlyStatusChange && parsedStatus.HasValue)
                {
                    if (parsedStatus == ReservationStatus.Canceled)
                    {
                        if (IsManager)
                        {
                            // Managers: inside window still require explicit override flag
                            if (insideCancelWindow && !managerOverride)
                                return BadRequest($"Reservations cannot be modified within {settings.CancelWindowHours} hours of start time without manager approval.");
                        }
                        else if (IsProvider)
                        {
                            // Providers: follow ProviderCancelPolicy
                            var policy = settings.ProviderCancelPolicy;

                            switch (policy)
                            {
                                case Models.Tenant.ProviderCancelPolicy.AnyTime:
                                    // allow regardless of window (most permissive)
                                    break;

                                case Models.Tenant.ProviderCancelPolicy.RespectWindow:
                                    // deny inside window unless elevated by a manager (provider cannot elevate)
                                    if (insideCancelWindow)
                                        return BadRequest($"Providers cannot cancel within {settings.CancelWindowHours} hours of start time. Ask a manager to override.");
                                    break;

                                case Models.Tenant.ProviderCancelPolicy.None:
                                    // no provider cancels at all
                                    return Forbid();
                            }
                        }
                    }
                    else if (parsedStatus == ReservationStatus.Completed || parsedStatus == ReservationStatus.NoShow)
                    {
                        // After start: allowed for both roles. Before start: manager override required.
                        if (now < reservation.StartTime && !(managerOverride && IsManager))
                            return BadRequest("Cannot set Completed/NoShow before the start time without manager override.");
                    }
                }
                else
                {
                    // General edits: inside window require manager override
                    if (reservation.StartTime - now < cancelWindow && !(managerOverride && IsManager))
                        return BadRequest($"Reservations cannot be modified within {settings.CancelWindowHours} hours of start time without manager approval.");
                }
            }

            // Availability/resource conflict checks only when time/provider/resource may change
            var warnDoubleBook = false;
            if (!isOnlyStatusChange)
            {
                var c = await _conflicts.CheckReservationUpdateAsync(
                    id,
                    OrganizationId,
                    newProviderId,
                    newStart,
                    newEnd,
                    newResourceId,
                    ct);

                if (c.OutsideProviderAvailability)
                {
                    var isOwnProvider = IsProvider && newProviderId == UserId;
                    var canOverride =
                        (IsManager && overrideAvailability) ||
                        (isOwnProvider && overrideAvailability);

                    if (!canOverride)
                        return Conflict(new { code = "OUTSIDE_AVAILABILITY", message = "This time is outside provider availability." });
                }

                if (c.ProviderBlocked || c.ResourceBlocked)
                    return Conflict(new { code = "UNAVAILABLE", message = "This time is blocked by the provider or resource." });

                warnDoubleBook = c.ReservationOverlap && IsProvider;
            }

            // Apply updates
            if (dto.Notes is not null) reservation.Notes = dto.Notes;
            if (dto.ResourceId is not null) reservation.ResourceId = dto.ResourceId;
            if (dto.PackageAssignmentId.HasValue) reservation.PackageAssignmentId = dto.PackageAssignmentId;
            if (parsedStatus.HasValue) reservation.Status = parsedStatus.Value;

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
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Delete(
            [FromRoute] int id, CancellationToken ct,
            [FromQuery] bool managerOverride = false)
        {
            var entity = await _db.Reservations
                .FirstOrDefaultAsync(r => r.Id == id && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);

            if (entity is null) return NotFound();

            // Safeguard: only managers or the owning provider may delete.
            if (!ReservationScopes.CanModify(entity, UserId, IsManager, IsProvider, isClient: false))
                return Forbid();

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

        /// <summary>
        /// Maps entity to DTO (status as string).
        /// </summary>
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
