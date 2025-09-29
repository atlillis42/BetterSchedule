using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Business;
using BetterSchedule.Server.Models.DTOs.Reservation;
using BetterSchedule.Server.Models.DTOs.ReservationParticipant;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Models.Tenant;
using BetterSchedule.Server.Models.Tenant.SettingsHelpers;
using BetterSchedule.Server.Services.Scheduling;
using BetterSchedule.Server.Services.Time;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using static BetterSchedule.Server.Auth.ReservationScopes;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    /// <summary>
    /// Reservation API
    ///
    /// Responsibilities
    /// - Read/write reservations within the caller's organization.
    /// - Enforce MinLeadMinutes and CancelWindowHours via <see cref="OrganizationSettings"/>.
    /// - Enforce provider availability + blocked-time constraints via <see cref="ISchedulingConflictService"/>.
    /// - Perform package redemption bookkeeping when status transitions to/from <c>Completed</c>.
    ///
    /// Security &amp; Visibility
    /// - All endpoints are org-scoped via <see cref="OrgControllerBase"/>.
    /// - Visibility for list/get is governed by <see cref="ReservationScopes.VisibleTo"/>.
    /// - Create/Update/Delete are allowed for Managers and Service Providers (subject to scope).
    /// - Clients can self-cancel via <see cref="CancelAsClient"/> when org policy allows.
    /// </summary>
    [ApiController]
    [Route("api/reservation")]
    [Authorize]
    public sealed class ReservationController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IDateTimeProvider _clock;
        private readonly ISchedulingConflictService _conflicts;

        public ReservationController(ApplicationDbContext db, IDateTimeProvider clock, ISchedulingConflictService conflicts)
        {
            _db = db;
            _clock = clock;
            _conflicts = conflicts;
        }

        /// <summary>
        /// Lists reservations overlapping an optional [start, end) time window and visible to the caller.
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
        /// Gets a reservation by identifier if visible to the caller.
        /// </summary>
        [HttpGet("{id:int}")]
        public async Task<ActionResult<ReservationDto>> GetById([FromRoute] int id, CancellationToken ct)
        {
            var dto = await _db.Reservations
                .VisibleTo(OrganizationId, UserId, IsManager, IsProvider, IsClient)
                .Where(r => r.Id == id)
                .Select(ToDto())
                .FirstOrDefaultAsync(ct);

            return dto is null ? NotFound() : Ok(dto);
        }

        /// <summary>
        /// Creates a new reservation (Managers and Service Providers).
        /// Enforces lead time, provider availability, and blocked-time rules.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<ActionResult<ReservationDto>> Create(
            [FromBody] CreateReservationDto dto,
            CancellationToken ct,
            bool overrideAvailability = false)
        {
            if (dto.StartTime >= dto.EndTime)
                return BadRequest("EndTime must be after StartTime.");

            var settings = await _db.OrganizationSettings.AsNoTracking()
                .FirstOrDefaultAsync(s => s.OrganizationId == OrganizationId, ct);

            if (settings is not null &&
                BookingPolicy.ViolatesLeadTime(settings.MinLeadMinutes, _clock.UtcNow, dto.StartTime))
            {
                return BadRequest($"Reservations must be created at least {settings.MinLeadMinutes} minutes in advance.");
            }

            var c = await _conflicts.CheckReservationCreateAsync(
                OrganizationId,
                dto.ServiceProviderId,
                dto.StartTime,
                dto.EndTime,
                dto.ResourceId,
                ct);

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

            // Validate package assignment, if any (no decrement on create)
            if (dto.PackageAssignmentId.HasValue)
            {
                var validation = await ValidateAssignmentForReservationAsync(
                    dto.PackageAssignmentId.Value,
                    OrganizationId,
                    dto.ClientId,
                    dto.AppointmentTypeId,
                    dto.ServiceProviderId,
                    requireRemainingUse: false,
                    ct: ct);
                if (validation is not null) return validation;
            }

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
                CreatedAt = _clock.UtcNow,
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
        /// Updates an existing reservation (Managers and Service Providers).
        /// Handles status transitions and package redemption bookkeeping atomically.
        /// </summary>
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Update(
            [FromRoute] int id,
            [FromBody] UpdateReservationDto dto,
            CancellationToken ct,
            bool managerOverride = false,
            bool overrideAvailability = false)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            var reservation = await _db.Reservations
                .FirstOrDefaultAsync(r => r.Id == id && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);
            if (reservation is null) return NotFound();

            if (!ReservationScopes.CanModify(reservation, UserId, IsManager, IsProvider, isClient: false))
                return Forbid();

            var settings = await _db.OrganizationSettings.AsNoTracking()
                .FirstOrDefaultAsync(s => s.OrganizationId == OrganizationId, ct);

            var now = _clock.UtcNow;

            // Parse and normalize status intent
            var isStatusProvided = !string.IsNullOrWhiteSpace(dto.Status);
            ReservationStatus? parsedStatus = null;
            if (isStatusProvided)
            {
                if (!Enum.TryParse<ReservationStatus>(dto.Status, true, out var sParsed))
                    return BadRequest($"Unknown status '{dto.Status}'.");
                parsedStatus = sParsed;
            }
            var wantsCancel = parsedStatus == ReservationStatus.Canceled;

            var isOnlyStatusChange =
                isStatusProvided &&
                dto.StartTime is null &&
                dto.EndTime is null &&
                dto.ResourceId is null &&
                dto.ServiceProviderId is null &&
                dto.AppointmentTypeId is null &&
                !dto.PackageAssignmentId.HasValue;

            if (isOnlyStatusChange && parsedStatus == reservation.Status && dto.Notes is null)
                return NoContent();

            // Effective values after patch
            var newProviderId = dto.ServiceProviderId ?? reservation.ServiceProviderId;
            var newTypeId = dto.AppointmentTypeId ?? reservation.AppointmentTypeId;
            var newStart = dto.StartTime ?? reservation.StartTime;
            var newEnd = dto.EndTime ?? reservation.EndTime;
            var newResourceId = dto.ResourceId ?? reservation.ResourceId;

            // Lead-time check for any schedule change
            if (!isOnlyStatusChange)
            {
                if (newEnd <= newStart)
                    return BadRequest("EndTime must be after StartTime.");

                if (settings is not null &&
                    BookingPolicy.ViolatesLeadTime(settings.MinLeadMinutes, now, newStart))
                    return BadRequest($"Reservations must be scheduled at least {settings.MinLeadMinutes} minutes in advance.");
            }

            // Cancel-window / policy checks
            if (settings is not null)
            {
                var cancelWindow = TimeSpan.FromHours(settings.CancelWindowHours);
                var insideCancelWindow = reservation.StartTime - now < cancelWindow;

                if (wantsCancel && parsedStatus.HasValue)
                {
                    if (IsManager)
                    {
                        if (insideCancelWindow && !managerOverride)
                            return BadRequest($"Reservations cannot be modified within {settings.CancelWindowHours} hours of start time without manager approval.");
                    }
                    else if (IsProvider)
                    {
                        var allow = BookingPolicy.CanProviderCancel(settings.ProviderCancelPolicy, cancelWindow, now, reservation.StartTime);
                        if (!allow)
                            return BadRequest("Providers are not allowed to cancel at this time per organization policy.");
                    }
                }
                else
                {
                    // Non-cancel modifications inside window require Manager override
                    if (insideCancelWindow && !(managerOverride && IsManager))
                        return BadRequest($"Reservations cannot be modified within {settings.CancelWindowHours} hours of start time without manager approval.");
                }
            }

            // Availability/resource checks when changing schedule
            var warnDoubleBook = false;
            if (!isOnlyStatusChange)
            {
                var c = await _conflicts.CheckReservationUpdateAsync(
                    id, OrganizationId, newProviderId, newStart, newEnd, newResourceId, ct);

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

            // Package validations / consumption bookkeeping
            var wasCompleted = reservation.Status == ReservationStatus.Completed;
            var willBeCompleted = parsedStatus.HasValue ? parsedStatus.Value == ReservationStatus.Completed : wasCompleted;

            var oldAssignmentId = reservation.PackageAssignmentId;
            var newAssignmentId = dto.PackageAssignmentId.HasValue
                ? dto.PackageAssignmentId
                : oldAssignmentId;

            var changingAssignment = dto.PackageAssignmentId.HasValue && newAssignmentId != oldAssignmentId;

            if (changingAssignment && newAssignmentId.HasValue)
            {
                var requireRemaining = willBeCompleted;
                var assignmentProblem = await ValidateAssignmentForReservationAsync(
                    newAssignmentId.Value, OrganizationId, reservation.ClientId,
                    newTypeId, newProviderId, requireRemainingUse: requireRemaining, ct: ct);
                if (assignmentProblem is not null) return assignmentProblem;
            }

            if (!changingAssignment && willBeCompleted && oldAssignmentId.HasValue)
            {
                var assignmentProblem = await ValidateAssignmentForReservationAsync(
                    oldAssignmentId.Value, OrganizationId, reservation.ClientId,
                    newTypeId, newProviderId, requireRemainingUse: true, ct: ct);
                if (assignmentProblem is not null) return assignmentProblem;
            }

            // Apply patch
            if (dto.Notes is not null) reservation.Notes = dto.Notes;
            if (dto.ResourceId is not null) reservation.ResourceId = dto.ResourceId;
            if (dto.PackageAssignmentId.HasValue) reservation.PackageAssignmentId = dto.PackageAssignmentId;
            if (parsedStatus.HasValue) reservation.Status = parsedStatus.Value;

            reservation.ServiceProviderId = newProviderId;
            reservation.AppointmentTypeId = newTypeId;
            reservation.StartTime = newStart;
            reservation.EndTime = newEnd;
            reservation.UpdatedAt = _clock.UtcNow;

            // Redemption-aware counters
            var currentRedemption = await _db.PackageRedemptions
                .FirstOrDefaultAsync(x => x.OrganizationId == OrganizationId && x.ReservationId == reservation.Id, ct);

            var effectiveAssignmentId = reservation.PackageAssignmentId;
            var assignmentChanged = changingAssignment;

            async Task ConsumeAsync(int assignmentId, CancellationToken token)
            {
                var a = await _db.PackageAssignments
                    .FirstOrDefaultAsync(x => x.Id == assignmentId && x.OrganizationId == OrganizationId && !x.IsDeleted, token);
                if (a is null) throw new InvalidOperationException("Package assignment not found.");
                if (a.RemainingUses <= 0) throw new InvalidOperationException("No remaining uses on the selected package.");
                a.RemainingUses -= 1;
                _db.PackageAssignments.Update(a);

                _db.PackageRedemptions.Add(new PackageRedemption
                {
                    OrganizationId = OrganizationId,
                    PackageAssignmentId = assignmentId,
                    ReservationId = reservation.Id,
                    Uses = 1,
                    CreatedAt = _clock.UtcNow
                });
            }

            async Task RestoreAsync(PackageRedemption red, CancellationToken token)
            {
                var a = await _db.PackageAssignments
                    .FirstOrDefaultAsync(x => x.Id == red.PackageAssignmentId && x.OrganizationId == OrganizationId && !x.IsDeleted, token);
                if (a is not null)
                {
                    a.RemainingUses += red.Uses;
                    _db.PackageAssignments.Update(a);
                }
                _db.PackageRedemptions.Remove(red);
            }

            // 1) Not Completed -> Completed: consume
            // 2) Completed -> Not Completed: restore
            // 3) Completed + assignment changed: move redemption
            if (!wasCompleted && willBeCompleted)
            {
                if (effectiveAssignmentId.HasValue)
                {
                    if (currentRedemption is null)
                    {
                        await ConsumeAsync(effectiveAssignmentId.Value, ct);
                    }
                    else if (assignmentChanged && currentRedemption.PackageAssignmentId != effectiveAssignmentId.Value)
                    {
                        await RestoreAsync(currentRedemption, ct);
                        await ConsumeAsync(effectiveAssignmentId.Value, ct);
                    }
                }
            }
            else if (wasCompleted && !willBeCompleted)
            {
                if (currentRedemption is not null)
                {
                    await RestoreAsync(currentRedemption, ct);
                }
            }
            else if (wasCompleted && willBeCompleted && assignmentChanged)
            {
                if (effectiveAssignmentId.HasValue)
                {
                    if (currentRedemption is not null)
                        await RestoreAsync(currentRedemption, ct);
                    await ConsumeAsync(effectiveAssignmentId.Value, ct);
                }
                else if (currentRedemption is not null)
                {
                    await RestoreAsync(currentRedemption, ct);
                }
            }

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            if (warnDoubleBook) Response.Headers["X-Warned-Double-Booking"] = "true";
            return NoContent();
        }

        /// <summary>
        /// Allows a client to cancel their own upcoming reservation (or a Manager to cancel on behalf of a client).
        /// Enforces organization cancel window and ties client permission to provider policy.
        /// </summary>
        [HttpPost("{id:int}/cancel")]
        [Authorize(Roles = "Client,Manager")]
        public async Task<IActionResult> CancelAsClient([FromRoute] int id, CancellationToken ct, [FromQuery] bool managerOverride = false)
        {
            var reservation = await _db.Reservations
                .FirstOrDefaultAsync(r => r.Id == id && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);

            if (reservation is null) return NotFound();

            if (!IsManager)
            {
                if (!IsClient || reservation.ClientId != UserId)
                    return Forbid();
            }

            if (reservation.Status == ReservationStatus.Canceled)
                return NoContent();

            if (reservation.Status == ReservationStatus.Completed || reservation.Status == ReservationStatus.NoShow)
                return BadRequest("This reservation cannot be canceled in its current state.");

            var now = _clock.UtcNow;
            if (now >= reservation.StartTime)
                return BadRequest("Cannot cancel after the reservation start time.");

            var settings = await _db.OrganizationSettings.AsNoTracking()
                .FirstOrDefaultAsync(s => s.OrganizationId == OrganizationId, ct);

            if (settings is not null)
            {
                var cancelWindow = TimeSpan.FromHours(settings.CancelWindowHours);

                var allowed = BookingPolicy.CanClientCancel(
                    settings.ClientCancelPolicy,
                    settings.ProviderCancelPolicy,
                    cancelWindow,
                    now,
                    reservation.StartTime);

                if (!allowed && !(IsManager && managerOverride))
                    return BadRequest("This reservation cannot be canceled per organization policy.");
            }

            reservation.Status = ReservationStatus.Canceled;
            reservation.UpdatedAt = now;
            await _db.SaveChangesAsync(ct);

            return NoContent();
        }

        /// <summary>
        /// Soft deletes a reservation (Managers and Service Providers).
        /// Does not automatically restore package usage; use status transitions for that.
        /// </summary>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Delete(
            [FromRoute] int id,
            CancellationToken ct,
            [FromQuery] bool managerOverride = false,
            [FromQuery] bool providerOverride = false) 
        {
            var entity = await _db.Reservations
                .FirstOrDefaultAsync(r => r.Id == id && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);
            if (entity is null) return NotFound();

            if (!ReservationScopes.CanModify(entity, UserId, IsManager, IsProvider, isClient: false))
                return Forbid();

            var settings = await _db.OrganizationSettings.AsNoTracking()
                .FirstOrDefaultAsync(s => s.OrganizationId == OrganizationId, ct);

            if (settings is not null)
            {
                var now = _clock.UtcNow;
                var cancelWindow = TimeSpan.FromHours(settings.CancelWindowHours);
                var inside = entity.StartTime - now < cancelWindow;

                if (inside)
                {
                    var isAssignedProvider = IsProvider && entity.ServiceProviderId == UserId;
                    var allowed =
                        (IsManager && managerOverride) ||
                        (isAssignedProvider && providerOverride); // 👈 allow assigned provider
                    if (!allowed)
                        return BadRequest($"Reservations cannot be deleted within {settings.CancelWindowHours} hours of start time without manager override or assigned provider confirmation.");
                }
            }

            entity.IsDeleted = true;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // --------------------------
        // Helpers
        // --------------------------

        /// <summary>Map entity -> DTO (status as string).</summary>
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

        /// <summary>
        /// Validates that a package assignment is eligible to be associated with the reservation context provided.
        /// Performs a join with the Package to check catalog properties (type, lock, active).
        /// </summary>
        private async Task<ActionResult?> ValidateAssignmentForReservationAsync(
            int assignmentId,
            string orgId,
            string clientId,
            int appointmentTypeId,
            string serviceProviderId,
            bool requireRemainingUse,
            CancellationToken ct)
        {
            var row = await (
                from assign in _db.PackageAssignments.AsNoTracking()
                join pkg in _db.Packages.AsNoTracking() on assign.PackageId equals pkg.Id
                where assign.Id == assignmentId
                      && assign.OrganizationId == orgId
                      && pkg.OrganizationId == orgId
                      && !assign.IsDeleted
                      && pkg.IsActive
                select new { assign, pkg })
                .FirstOrDefaultAsync(ct);

            if (row is null) return BadRequest("Package assignment not found.");

            var a = row.assign;
            var p = row.pkg;

            if (a.ClientId != clientId) return BadRequest("Package assignment belongs to a different client.");
            if (p.AppointmentTypeId != appointmentTypeId) return BadRequest("Package does not match appointment type.");

            if (p.ProviderLocked)
            {
                if (string.IsNullOrWhiteSpace(p.ProviderId) || p.ProviderId != serviceProviderId)
                    return BadRequest("This package is locked to a different provider.");
            }

            if (a.ExpiresAtUtc.HasValue && _clock.UtcNow > a.ExpiresAtUtc.Value)
                return BadRequest("Package assignment is expired.");

            if (requireRemainingUse && a.RemainingUses <= 0)
                return BadRequest("No remaining uses on the selected package.");

            return null;
        }
    }
}
