using BetterSchedule.Server.Auth;
using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.Business;
using BetterSchedule.Server.Models.DTOs.Reservation;
using BetterSchedule.Server.Models.DTOs.ReservationParticipant;
using BetterSchedule.Server.Models.Scheduling;
using BetterSchedule.Server.Models.Tenant;
using BetterSchedule.Server.Models.Tenant.SettingsHelpers;
using BetterSchedule.Server.Services.Errors;
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
    /// - Classify late cancellations (no grace).
    /// - Check reservation/resource overlaps and blocked-time conflicts.
    /// - Perform package redemption bookkeeping when status transitions to/from <c>Completed</c>.
    ///
    /// Security/Visibility
    /// - All endpoints are org-scoped via <see cref="OrgControllerBase"/>.
    /// - Visibility for list/get is governed by <see cref="ReservationScopes.VisibleTo"/>.
    /// - Create/Update/Delete are allowed for Managers and Service Providers (subject to scope).
    /// - Clients can self-cancel pre-start via <see cref="CancelAsClient"/>; inside the window they are marked late.
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
        /// Enforces lead time; checks for reservation/resource overlaps and blocked times.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<ActionResult<ReservationDto>> Create(
            [FromBody] CreateReservationDto dto,
            CancellationToken ct)
        {
            if (dto.StartTime >= dto.EndTime)
                return BadRequest(ApiError.Validation("EndTime must be after StartTime."));

            var settings = await _db.OrganizationSettings.AsNoTracking()
                .FirstOrDefaultAsync(s => s.OrganizationId == OrganizationId, ct);

            if (settings is not null &&
                BookingPolicy.ViolatesLeadTime(settings.MinLeadMinutes, _clock.UtcNow, dto.StartTime))
            {
                // Allow assigned provider to create inside lead time; otherwise block.
                var providerSelf = IsProvider && dto.ServiceProviderId == UserId;
                if (!providerSelf)
                    return BadRequest(ApiError.Validation(
                        $"Reservations must be created at least {settings.MinLeadMinutes} minutes in advance."));
            }

            var c = await _conflicts.CheckReservationCreateAsync(
                OrganizationId,
                dto.ServiceProviderId,
                dto.StartTime,
                dto.EndTime,
                dto.ResourceId,
                ct);

            // Hard blocks: provider/resource blocked windows
            if (c.ProviderBlocked || c.ResourceBlocked)
                return Conflict(ApiError.ReservationConflict("This time is blocked by the provider or resource."));

            // Optional signal if double-booking the provider (soft — just a header)
            var warnDoubleBook = c.ReservationOverlap && IsProvider;

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
        /// Staff may reschedule/cancel at any time; conflicts produce soft warnings for overlaps
        /// and hard errors for blocked-time collisions.
        /// </summary>
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        public async Task<IActionResult> Update(
            [FromRoute] int id,
            [FromBody] UpdateReservationDto dto,
            CancellationToken ct)
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
                    return BadRequest(ApiError.Validation($"Unknown status '{dto.Status}'."));
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

            // Effective values after patch
            var newProviderId = dto.ServiceProviderId ?? reservation.ServiceProviderId;
            var newTypeId = dto.AppointmentTypeId ?? reservation.AppointmentTypeId;
            var newStart = dto.StartTime ?? reservation.StartTime;
            var newEnd = dto.EndTime ?? reservation.EndTime;
            var newResourceId = dto.ResourceId ?? reservation.ResourceId;

            // For staff, allow rescheduling anytime; only require that End > Start
            if (!isOnlyStatusChange && newEnd <= newStart)
                return BadRequest(ApiError.Validation("EndTime must be after StartTime."));

            // Conflict checks when changing schedule
            var warnDoubleBook = false;
            if (!isOnlyStatusChange)
            {
                var c = await _conflicts.CheckReservationUpdateAsync(
                    id, OrganizationId, newProviderId, newStart, newEnd, newResourceId, ct);

                if (c.ProviderBlocked || c.ResourceBlocked)
                    return Conflict(ApiError.ReservationConflict("This time is blocked by the provider or resource."));

                // Soft warning header for provider double-book
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

            if (parsedStatus.HasValue)
            {
                // Transition to Canceled -> record metadata and classify lateness
                if (parsedStatus.Value == ReservationStatus.Canceled && reservation.Status != ReservationStatus.Canceled)
                {
                    var orgSettings = settings ?? new OrganizationSettings();
                    reservation.CancelledAt = now;
                    reservation.CancelledByUserId = UserId;
                    reservation.CancelReason = "StaffAction";
                    reservation.CancelSource = CancellationSource.Staff;
                    reservation.IsLateCancel = BookingPolicy.IsLateCancel(
                        now, reservation.StartTime, orgSettings.TimeZoneId, orgSettings.CancelWindowHours);
                }

                reservation.Status = parsedStatus.Value;
            }

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
        /// Policy: client cancels are allowed pre-start; inside the window they are marked as "late".
        /// Managers may cancel anytime.
        /// </summary>
        [HttpPost("{id:int}/cancel")]
        [Authorize(Roles = "Client,Manager")]
        public async Task<IActionResult> CancelAsClient([FromRoute] int id, CancellationToken ct)
        {
            var reservation = await _db.Reservations
                .FirstOrDefaultAsync(r => r.Id == id && r.OrganizationId == OrganizationId && !r.IsDeleted, ct);

            if (reservation is null) return NotFound();

            // Role/scope: client can cancel self; manager can cancel anyone
            if (!IsManager)
            {
                if (!IsClient || reservation.ClientId != UserId)
                    return Forbid();
            }

            if (reservation.Status == ReservationStatus.Canceled)
                return NoContent();

            if (reservation.Status == ReservationStatus.Completed || reservation.Status == ReservationStatus.NoShow)
                return BadRequest(ApiError.Validation("This reservation cannot be canceled in its current state."));

            var now = _clock.UtcNow;

            var settings = await _db.OrganizationSettings.AsNoTracking()
                .FirstOrDefaultAsync(s => s.OrganizationId == OrganizationId, ct) ?? new OrganizationSettings();

            // Client policy: pre-start only (hard rule). Managers are unrestricted.
            if (!IsManager && now >= reservation.StartTime)
                return BadRequest(ApiError.Validation("Cannot cancel after the reservation start time."));

            // Classify lateness (org-local)
            var isLate = BookingPolicy.IsLateCancel(
                now,
                reservation.StartTime,
                settings.TimeZoneId,
                settings.CancelWindowHours);

            reservation.Status = ReservationStatus.Canceled;
            reservation.CancelledAt = now;
            reservation.CancelledByUserId = UserId;
            reservation.CancelReason = IsManager ? "StaffAction" : "ClientRequest";
            reservation.CancelSource = IsManager ? CancellationSource.Staff : CancellationSource.ClientPortal;
            reservation.IsLateCancel = isLate;
            reservation.UpdatedAt = now;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // --------------------------
        // Helpers
        // --------------------------

        /// <summary>Map entity -> DTO (status as string). Note: cancellation metadata is not projected yet.</summary>
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

            if (row is null) return BadRequest(ApiError.Validation("Package assignment not found."));

            var a = row.assign;
            var p = row.pkg;

            if (a.ClientId != clientId) return BadRequest(ApiError.Validation("Package assignment belongs to a different client."));
            if (p.AppointmentTypeId != appointmentTypeId) return BadRequest(ApiError.Validation("Package does not match appointment type."));

            if (p.ProviderLocked)
            {
                if (string.IsNullOrWhiteSpace(p.ProviderId) || p.ProviderId != serviceProviderId)
                    return BadRequest(ApiError.Validation("This package is locked to a different provider."));
            }

            if (a.ExpiresAtUtc.HasValue && _clock.UtcNow > a.ExpiresAtUtc.Value)
                return BadRequest(ApiError.Validation("Package assignment is expired."));

            if (requireRemainingUse && a.RemainingUses <= 0)
                return BadRequest(ApiError.Validation("No remaining uses on the selected package."));

            return null;
        }
    }
}
