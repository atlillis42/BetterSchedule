using BetterSchedule.Server.Controllers.Organization;
using BetterSchedule.Server.Database;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Controllers.Scheduling
{
    /// <summary>
    /// Queries bookable time slots for a provider in a time window,
    /// combining provider availability with reservations and blocked time.
    /// Intended for client self-scheduling and pre-booking UIs.
    /// </summary>
    [ApiController]
    [Route("api/open-slots")]
    [Authorize(Roles = "Manager,ServiceProvider,Client")]
    public sealed class OpenSlotsController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;

        public OpenSlotsController(ApplicationDbContext db) => _db = db;

        /// <summary>
        /// Returns prospective bookable slots for a specific provider and appointment type in the given window.
        /// Respects provider <c>AvailabilityPublic</c> for clients; managers/providers may query regardless.
        /// </summary>
        /// <param name="providerId">Target provider.</param>
        /// <param name="appointmentTypeId">Appointment type to size slots (duration).</param>
        /// <param name="start">Start of query window (inclusive).</param>
        /// <param name="end">End of query window (exclusive).</param>
        /// <param name="resourceId">Optional resource constraint.</param>
        [HttpGet("providers/{providerId}")]
        [ProducesResponseType(typeof(IEnumerable<OpenSlotDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetProviderSlots(
            [FromRoute] string providerId,
            [FromQuery] int appointmentTypeId,
            [FromQuery] DateTimeOffset start,
            [FromQuery] DateTimeOffset end,
            [FromQuery] int? resourceId,
            CancellationToken ct)
        {
            // Basic validation
            if (end <= start) return BadRequest("End must be after Start.");

            // Org scope: ensure provider belongs to org and is a ServiceProvider
            var provider = await _db.Users
                .Where(u => u.OrganizationId == OrganizationId && u.Id == providerId)
                .SingleOrDefaultAsync(ct);
            if (provider is null) return NotFound("Provider not found in this organization.");

            var isProviderRole = await _db.UserRoles
                .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => new { ur.UserId, r.Name })
                .AnyAsync(x => x.UserId == providerId && x.Name == "ServiceProvider", ct);
            if (!isProviderRole) return BadRequest("User is not a ServiceProvider.");

            // Clients may only query if the provider exposes availability publicly.
            var callerIsClient = User.IsInRole("Client") && !User.IsInRole("Manager") && !User.IsInRole("ServiceProvider");
            if (callerIsClient && !provider.AvailabilityPublic)
                return Forbid();

            // Appointment type must be in org and not deleted
            var appt = await _db.AppointmentTypes
                .Where(a => a.OrganizationId == OrganizationId && a.Id == appointmentTypeId && !a.IsDeleted)
                .SingleOrDefaultAsync(ct);
            if (appt is null) return BadRequest("Appointment type not found.");

            // Resource (if provided) must be in org and not deleted
            if (resourceId.HasValue)
            {
                var resourceOk = await _db.CalendarResources
                    .AnyAsync(r => r.OrganizationId == OrganizationId && r.Id == resourceId.Value && !r.IsDeleted, ct);
                if (!resourceOk) return BadRequest("Resource not found.");
            }

            // TODO:
            // For now, we’re exposing the API shape and auth/validation only.
            // Slot generation will be implemented in a dedicated service to combine:
            // - ProviderAvailability windows (EffectiveFrom/To + DayOfWeek + local times)
            // - OrganizationSettings (MinLeadMinutes, CancelWindowHours)
            // - Reservations and BlockedTime overlaps
            // - Optional resource constraints and AppointmentTypeResourceAccess
            // - Step equal to appointment Duration
            //
            // Return 501 until the service is wired up.
            return StatusCode(StatusCodes.Status501NotImplemented);
        }

        /// <summary>
        /// A single open slot 
        /// </summary>
        public sealed record OpenSlotDto(
            // TODO:
        // <summary>Start time of the suggested slot.</summary> DateTimeOffset Start,
        // <summary>End time of the suggested slot.</summary> DateTimeOffset End,
        // <summary>Service provider for the slot.</summary> string ProviderId,
        // <summary>Optional resource reserved for the slot (if applicable).</summary> int? ResourceId
        );
    }
}
