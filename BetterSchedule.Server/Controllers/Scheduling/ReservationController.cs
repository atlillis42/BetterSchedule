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
    /// Responsibilities:
    /// <list type="bullet">
    /// <item><description>Read/write reservations within the caller's organization.</description></item>
    /// <item><description>Classify late cancellations (no grace).</description></item>
    /// <item><description>Check reservation/resource overlaps and blocked-time conflicts.</description></item>
    /// <item><description>Perform package redemption bookkeeping when status transitions to/from <see cref="ReservationStatus.Completed"/>.</description></item>
    /// </list>
    ///
    /// Security/Visibility:
    /// <list type="bullet">
    /// <item><description>All endpoints are org-scoped via <see cref="OrgControllerBase"/>.</description></item>
    /// <item><description>Visibility for list/get is governed by <see cref="ReservationScopes.VisibleTo"/>.</description></item>
    /// <item><description>Create/Update/Delete allowed for Managers and Service Providers (subject to scope).</description></item>
    /// <item><description>Clients can self-cancel pre-start via <see cref="CancelAsClient"/>; inside the window they are marked late.</description></item>
    /// </list>
    ///
    /// Policy highlights:
    /// <list type="bullet">
    /// <item><description><b>Lead time:</b> Managers and a Provider booking their own schedule are allowed inside lead time with a soft warning (header <c>X-Warned-Lead-Time: true</c>). Providers booking for other staff are blocked with a personalized message. Clients are hard-blocked (generic message).</description></item>
    /// <item><description><b>Conflicts:</b> For staff (Managers/Providers), provider/resource blocked windows and reservation overlaps are returned as soft warnings via headers (<c>X-Warned-Provider-Blocked</c>, <c>X-Warned-Resource-Blocked</c>, <c>X-Warned-Double-Booking</c>) and do not prevent create/update. Clients must be hard-blocked on provider/resource conflicts in client-facing endpoints.</description></item>
    /// </list>
    /// </summary>
    [ApiController]
    [Route("api/reservation")]
    [Authorize]
    public sealed class ReservationController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IDateTimeProvider _clock;
        private readonly ISchedulingConflictService _conflicts;

        /// <summary>Initializes a new <see cref="ReservationController"/>.</summary>
        public ReservationController(ApplicationDbContext db, IDateTimeProvider clock, ISchedulingConflictService conflicts)
        {
            _db = db;
            _clock = clock;
            _conflicts = conflicts;
        }

        /// <summary>
        /// Lists reservations overlapping an optional [start, end) time window and visible to the caller.
        /// </summary>
        /// <param name="start">Optional inclusive start of the window (UTC).</param>
        /// <param name="end">Optional exclusive end of the window (UTC).</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>Visible reservations ordered by start time.</returns>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<ReservationDto>), StatusCodes.Status200OK)]
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
        /// <param name="id">Reservation identifier.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>The reservation when found and visible; <c>404</c> otherwise.</returns>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(ReservationDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
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
        /// </summary>
        /// <remarks>
        /// Enforcement:
        /// <list type="bullet">
        /// <item><description><b>Lead time:</b>
        /// <para>- Manager: warn only (<c>X-Warned-Lead-Time: true</c>), allow.</para>
        /// <para>- Provider booking own schedule: warn only (<c>X-Warned-Lead-Time: true</c>), allow.</para>
        /// <para>- Provider booking for other staff: <c>400</c> with personalized message.</para>
        /// <para>- Client: <c>400</c> with generic message (not applicable on this route due to role restriction).</para>
        /// </description></item>
        /// <item><description><b>Conflicts:</b> For Managers/Providers, provider/resource blocked windows and reservation overlaps are soft warnings via headers:
        /// <c>X-Warned-Provider-Blocked</c>, <c>X-Warned-Resource-Blocked</c>, <c>X-Warned-Double-Booking</c>. No hard block. Client-facing endpoints should hard-block provider/resource conflicts.</description></item>
        /// </list>
        /// </remarks>
        /// <param name="dto">Create payload.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>The created reservation.</returns>
        [HttpPost]
        [Authorize(Roles = "Manager,ServiceProvider")]
        [ProducesResponseType(typeof(ReservationDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<ReservationDto>> Create(
            [FromBody] CreateReservationDto dto,
            CancellationToken ct)
        {
            if (dto.StartTime >= dto.EndTime)
                return BadRequest(ApiError.Validation("EndTime must be after StartTime."));

            var settings = await _db.OrganizationSettings.AsNoTracking()
                .FirstOrDefaultAsync(s => s.OrganizationId == OrganizationId, ct);

            // Lead-time policy
            if (settings is not null &&
                BookingPolicy.ViolatesLeadTime(settings.MinLeadMinutes, _clock.UtcNow, dto.StartTime))
            {
                var providerSelf = IsProvider && dto.ServiceProviderId == UserId;

                if (IsManager)
                {
                    // Manager override allowed, warn only.
                    Response.Headers["X-Warned-Lead-Time"] = "true";
                }
                else if (providerSelf)
                {
                    // Provider creating on own calendar allowed, warn only.
                    Response.Headers["X-Warned-Lead-Time"] = "true";
                }
                else if (IsProvider)
                {
                    // Provider booking for another staff member: block with personalized message.
                    return BadRequest(ApiError.Validation(
                        $"Reservations for other staff members must be created at least {settings.MinLeadMinutes} minutes in advance."));
                }
                else
                {
                    // Generic client message (this route is staff-only, but keep for clarity).
                    return BadRequest(ApiError.Validation(
                        $"Reservations must be created at least {settings.MinLeadMinutes} minutes in advance."));
                }
            }

            // Conflict checks (soft warnings for staff; clients should be blocked on public endpoints)
            var c = await _conflicts.CheckReservationCreateAsync(
                OrganizationId,
                dto.ServiceProviderId,
                dto.StartTime,
                dto.EndTime,
                dto.ResourceId,
                ct);

            // Provider/resource blocked -> warn (staff) or block (clients if ever applicable here)
            if (c.ProviderBlocked || c.ResourceBlocked)
            {
                if (IsManager || IsProvider)
                {
                    if (c.ProviderBlocked) Response.Headers["X-Warned-Provider-Blocked"] = "true";
                    if (c.ResourceBlocked) Response.Headers["X-Warned-Resource-Blocked"] = "true";
                }
                else
                {
                    return Conflict(ApiError.ReservationConflict("This time is blocked by the provider or resource."));
                }
            }

            // Reservation overlap -> soft warning header for all roles on this route (staff)
            var warnDoubleBook = c.ReservationOverlap;

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
        /// </summary>
        /// <remarks>
        /// Behavior:
        /// <list type="bullet">
        /// <item><description>Staff may reschedule at any time; only requires <c>EndTime &gt; StartTime</c>.</description></item>
        /// <item><description>Provider/resource blocked windows and reservation overlaps return soft warnings via headers
        /// (<c>X-Warned-Provider-Blocked</c>, <c>X-Warned-Resource-Blocked</c>, <c>X-Warned-Double-Booking</c>) and do not prevent update.</description></item>
        /// <item><description>Handles status transitions and package redemption bookkeeping atomically.</description></item>
        /// </list>
        /// </remarks>
        /// <param name="id">Reservation identifier.</param>
        /// <param name="dto">Update payload.</param>
        /// <param name="ct">Cancellation token.</param>
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Manager,ServiceProvider")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
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

                // Provider/resource blocked -> warn for staff
                if (c.ProviderBlocked) Response.Headers["X-Warned-Provider-Blocked"] = "true";
                if (c.ResourceBlocked) Response.Headers["X-Warned-Resource-Blocked"] = "true";

                // Double-book warning for staff updates
                warnDoubleBook = c.ReservationOverlap;
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
        /// </summary>
        /// <remarks>
        /// Policy:
        /// <list type="bullet">
        /// <item><description>Client cancels are allowed pre-start; inside the window they are recorded as late and may be subject to policy.</description></item>
        /// <item><description>Managers may cancel at any time.</description></item>
        /// </list>
        /// </remarks>
        /// <param name="id">Reservation identifier.</param>
        /// <param name="ct">Cancellation token.</param>
        [HttpPost("{id:int}/cancel")]
        [Authorize(Roles = "Client,Manager")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
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

        /// <summary>Projects <see cref="Reservation"/> to <see cref="ReservationDto"/> (status as string). Cancellation metadata is not projected.</summary>
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
