using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Business;
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

        public ReservationController(ApplicationDbContext db, ISchedulingConflictService conflicts)
        {
            _db = db;
            _conflicts = conflicts;
        }

        /// <summary>Lists reservations overlapping the optional time range and visible to the caller.</summary>
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

        /// <summary>Retrieves a reservation by identifier if visible to the caller.</summary>
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

        /// <summary>Creates a new reservation. Allowed for managers and service providers.</summary>
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<ActionResult<ReservationDto>> Create(
            [FromBody] CreateReservationDto dto,
            [FromQuery] CancellationToken ct,
            bool overrideAvailability = false)
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

            // Validate attached package assignment, if any (no decrement on create)
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

        /// <summary>Updates an existing reservation. Allowed for managers and service providers.</summary>
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Update(
            [FromRoute] int id,
            [FromBody] UpdateReservationDto dto,
            [FromQuery] CancellationToken ct,
            bool managerOverride = false,
            bool overrideAvailability = false)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            var reservation = await _db.Reservations
                .FirstOrDefaultAsync(r => r.Id == id && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);
            if (reservation is null) return NotFound();

            if (!ReservationScopes.CanModify(reservation, UserId, IsManager, IsProvider, isClient: false))
                return Forbid();

            var settings = await _db.OrganizationSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.OrganizationId == OrganizationId, ct);

            var now = DateTimeOffset.UtcNow;

            // Parse status (if supplied)
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

            if (isOnlyStatusChange && parsedStatus == reservation.Status && dto.Notes is null)
                return NoContent();

            // Effective values
            var newProviderId = dto.ServiceProviderId ?? reservation.ServiceProviderId;
            var newTypeId = dto.AppointmentTypeId ?? reservation.AppointmentTypeId;
            var newStart = dto.StartTime ?? reservation.StartTime;
            var newEnd = dto.EndTime ?? reservation.EndTime;
            var newResourceId = dto.ResourceId ?? reservation.ResourceId;

            if (!isOnlyStatusChange)
            {
                if (newEnd <= newStart)
                    return BadRequest("EndTime must be after StartTime.");

                if (settings is not null && newStart < now.AddMinutes(settings.MinLeadMinutes))
                    return BadRequest($"Reservations must be scheduled at least {settings.MinLeadMinutes} minutes in advance.");
            }

            // Cancel window / provider policy
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
                            if (insideCancelWindow && !managerOverride)
                                return BadRequest($"Reservations cannot be modified within {settings.CancelWindowHours} hours of start time without manager approval.");
                        }
                        else if (IsProvider)
                        {
                            var policy = settings.ProviderCancelPolicy;
                            switch (policy)
                            {
                                case Models.Tenant.ProviderCancelPolicy.AnyTime:
                                    break;
                                case Models.Tenant.ProviderCancelPolicy.RespectWindow:
                                    if (insideCancelWindow)
                                        return BadRequest($"Providers cannot cancel within {settings.CancelWindowHours} hours of start time. Ask a manager to override.");
                                    break;
                                case Models.Tenant.ProviderCancelPolicy.None:
                                    return Forbid();
                            }
                        }
                    }
                    else if (parsedStatus == ReservationStatus.Completed || parsedStatus == ReservationStatus.NoShow)
                    {
                        if (now < reservation.StartTime && !(managerOverride && IsManager))
                            return BadRequest("Cannot set Completed/NoShow before the start time without manager override.");
                    }
                }
                else
                {
                    if (reservation.StartTime - now < cancelWindow && !(managerOverride && IsManager))
                        return BadRequest($"Reservations cannot be modified within {settings.CancelWindowHours} hours of start time without manager approval.");
                }
            }

            // Availability/resource checks when needed
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

            // Apply updates
            if (dto.Notes is not null) reservation.Notes = dto.Notes;
            if (dto.ResourceId is not null) reservation.ResourceId = dto.ResourceId;
            if (dto.PackageAssignmentId.HasValue) reservation.PackageAssignmentId = dto.PackageAssignmentId;
            if (parsedStatus.HasValue) reservation.Status = parsedStatus.Value;

            reservation.ServiceProviderId = newProviderId;
            reservation.AppointmentTypeId = newTypeId;
            reservation.StartTime = newStart;
            reservation.EndTime = newEnd;
            reservation.UpdatedAt = DateTimeOffset.UtcNow;

            // --- Redemption-aware counter updates (atomic) ---

            var currentRedemption = await _db.PackageRedemptions
                .FirstOrDefaultAsync(x => x.OrganizationId == OrganizationId && x.ReservationId == reservation.Id, ct);

            var effectiveAssignmentId = reservation.PackageAssignmentId;          // after we applied dto changes above
            var assignmentChanged = changingAssignment;                           // from earlier computed flag

            // Helper local functions
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
                    CreatedAt = DateTimeOffset.UtcNow
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

            // CASES:
            // 1) Not Completed -> Completed: create redemption if assignment present and none exists.
            // 2) Completed -> Not Completed: delete redemption and restore uses.
            // 3) Completed stays Completed, but assignment changed: move redemption (restore old; consume new).
            // 4) Any status; Completed and correct assignment already redeemed: no-op.

            if (!wasCompleted && willBeCompleted)
            {
                if (effectiveAssignmentId.HasValue)
                {
                    if (currentRedemption is null)
                    {
                        await ConsumeAsync(effectiveAssignmentId.Value, ct);
                    }
                    else
                    {
                        // Already redeemed: if tied to a different assignment, move it
                        if (assignmentChanged && currentRedemption.PackageAssignmentId != effectiveAssignmentId.Value)
                        {
                            await RestoreAsync(currentRedemption, ct);
                            await ConsumeAsync(effectiveAssignmentId.Value, ct);
                        }
                        // else: already correct → no-op
                    }
                }
                // else: completing without a package assignment → no redemption, no counters (allowed per current rules)
            }
            else if (wasCompleted && !willBeCompleted)
            {
                // Leaving Completed: if we had consumed, restore
                if (currentRedemption is not null)
                {
                    await RestoreAsync(currentRedemption, ct);
                }
            }
            else if (wasCompleted && willBeCompleted && assignmentChanged)
            {
                // Stay Completed but switch assignments
                if (effectiveAssignmentId.HasValue)
                {
                    if (currentRedemption is not null)
                    {
                        await RestoreAsync(currentRedemption, ct);
                    }
                    await ConsumeAsync(effectiveAssignmentId.Value, ct);
                }
                else
                {
                    // Edge: removing assignment while keeping Completed → treat as restore (no assignment to charge)
                    if (currentRedemption is not null)
                    {
                        await RestoreAsync(currentRedemption, ct);
                    }
                }
            }

            // Persist all mutation work (reservation + packages + redemptions)
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            if (warnDoubleBook) Response.Headers["X-Warned-Double-Booking"] = "true";
            return NoContent();
        }

        /// <summary>Soft deletes a reservation.</summary>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct, [FromQuery] bool managerOverride = false)
        {
            var entity = await _db.Reservations
                .FirstOrDefaultAsync(r => r.Id == id && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);

            if (entity is null) return NotFound();

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

            // Note: we don't auto-restore uses on delete; use status transitions to restore.
            entity.IsDeleted = true;
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        /// <summary>
        /// Validates that a package assignment is eligible for this reservation context.
        /// Uses a join to Package (lean assignment model).
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

            if (a.ExpiresAtUtc.HasValue && DateTimeOffset.UtcNow > a.ExpiresAtUtc.Value)
                return BadRequest("Package assignment is expired.");

            if (requireRemainingUse && a.RemainingUses <= 0)
                return BadRequest("No remaining uses on the selected package.");

            return null;
        }


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
    }
}
