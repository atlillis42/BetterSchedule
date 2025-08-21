using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BetterSchedule.Server.Database;
using BetterSchedule.Server.Models.DTOs.Organization;
using BetterSchedule.Server.Models.Tenant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BetterSchedule.Server.Controllers.Organization
{
    /// <summary>
    /// Organization Settings API
    ///
    /// Responsibilities
    /// - Read/write per-organization preferences that affect calendar display, booking policy, and UX.
    /// - Bridge from UI-friendly DTOs (e.g., TimeSpan, string enums) to the OrganizationSettings entity.
    ///
    /// Key Behaviors
    /// - GET ensures a settings row exists (creates defaults on first access).
    /// - PUT performs partial updates (only provided fields change).
    ///
    /// Security
    /// - Manager-only; organization is scoped via OrgControllerBase.
    /// </summary>
    [ApiController]
    [Route("api/org-settings")]
    [Authorize(Roles = "Manager")]
    public sealed class OrgSettingsController : OrgControllerBase
    {
        private readonly ApplicationDbContext _db;
        public OrgSettingsController(ApplicationDbContext db) => _db = db;

        // --------------------------
        // GET: /api/org-settings
        // --------------------------
        /// <summary>
        /// Returns the current org's settings (creating a default row if missing).
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(OrgSettingsDto), StatusCodes.Status200OK)]
        public async Task<ActionResult<OrgSettingsDto>> Get(CancellationToken ct)
        {
            var s = await _db.OrganizationSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OrganizationId == OrganizationId, ct);

            if (s is null)
            {
                s = new OrganizationSettings
                {
                    OrganizationId = OrganizationId
                    // All other fields take model defaults you defined.
                };
                _db.OrganizationSettings.Add(s);
                await _db.SaveChangesAsync(ct);
            }

            return Ok(ToDto(s));
        }

        // --------------------------
        // PUT: /api/org-settings
        // --------------------------
        /// <summary>
        /// Updates the current org's settings. Only provided fields are modified.
        /// </summary>
        [HttpPut]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Update([FromBody] UpdateOrgSettingsDto dto, CancellationToken ct)
        {
            var s = await _db.OrganizationSettings
                .FirstOrDefaultAsync(x => x.OrganizationId == OrganizationId, ct);

            if (s is null)
            {
                s = new OrganizationSettings { OrganizationId = OrganizationId };
                _db.OrganizationSettings.Add(s);
            }

            // Time windows → stored as minutes/hours in entity
            if (dto.BookingLeadTime.HasValue)
                s.MinLeadMinutes = Clamp((int)Math.Round(dto.BookingLeadTime.Value.TotalMinutes), 0, 10080);

            if (dto.CancellationWindow.HasValue)
                s.CancelWindowHours = Clamp((int)Math.Round(dto.CancellationWindow.Value.TotalHours), 0, 168);

            // Calendar display / prefs
            if (dto.ShowWeekends.HasValue) s.ShowWeekends = dto.ShowWeekends.Value;
            if (dto.StartOfWeek.HasValue) s.StartOfWeek = Clamp(dto.StartOfWeek.Value, 0, 6);
            if (dto.BusinessHoursStartLocal.HasValue) s.BusinessHoursStartLocal = dto.BusinessHoursStartLocal.Value;
            if (dto.BusinessHoursEndLocal.HasValue) s.BusinessHoursEndLocal = dto.BusinessHoursEndLocal.Value;

            if (!string.IsNullOrWhiteSpace(dto.DefaultView))
                if (EnumTryParse(dto.DefaultView, out DefaultCalendarView dv)) s.DefaultView = dv;

            // Availability visualization / enforcement
            if (!string.IsNullOrWhiteSpace(dto.ShadingMode))
                if (EnumTryParse(dto.ShadingMode, out CalendarShadingMode sm)) s.ShadingMode = sm;

            if (!string.IsNullOrWhiteSpace(dto.AvailabilityEnforcement))
                if (EnumTryParse(dto.AvailabilityEnforcement, out AvailabilityEnforcement ae)) s.AvailabilityEnforcement = ae;

            if (dto.RequireConfirmOnOverrides.HasValue) s.RequireConfirmOnOverrides = dto.RequireConfirmOnOverrides.Value;
            if (dto.AvailabilityPublic.HasValue) s.AvailabilityPublic = dto.AvailabilityPublic.Value;
            if (dto.ProvidersCanEditOwnAvailability.HasValue) s.ProvidersCanEditOwnAvailability = dto.ProvidersCanEditOwnAvailability.Value;

            // Timezone / locale
            if (!string.IsNullOrWhiteSpace(dto.TimeZoneId))
                s.TimeZoneId = dto.TimeZoneId!.Length <= 64 ? dto.TimeZoneId! : s.TimeZoneId;

            if (!string.IsNullOrWhiteSpace(dto.Locale))
                s.Locale = dto.Locale!.Length <= 16 ? dto.Locale! : s.Locale;

            // Notifications
            if (dto.EmailEnabled.HasValue) s.EmailEnabled = dto.EmailEnabled.Value;
            if (dto.SmsEnabled.HasValue) s.SmsEnabled = dto.SmsEnabled.Value;
            if (dto.SendBookingConfirmation.HasValue) s.SendBookingConfirmation = dto.SendBookingConfirmation.Value;
            if (dto.ReminderHoursBefore.HasValue)
                s.ReminderHoursBefore = dto.ReminderHoursBefore.Value < 0 ? 0 : dto.ReminderHoursBefore.Value;

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // --------------------------
        // Mapping helpers
        // --------------------------
        private static OrgSettingsDto ToDto(OrganizationSettings s) => new()
        {
            // Booking windows
            BookingLeadTime = TimeSpan.FromMinutes(s.MinLeadMinutes),
            CancellationWindow = TimeSpan.FromHours(s.CancelWindowHours),

            // Calendar display
            ShowWeekends = s.ShowWeekends,
            StartOfWeek = s.StartOfWeek,
            BusinessHoursStartLocal = s.BusinessHoursStartLocal,
            BusinessHoursEndLocal = s.BusinessHoursEndLocal,
            DefaultView = s.DefaultView.ToString(),

            // Availability visualization / enforcement
            ShadingMode = s.ShadingMode.ToString(),
            AvailabilityEnforcement = s.AvailabilityEnforcement.ToString(),
            RequireConfirmOnOverrides = s.RequireConfirmOnOverrides,
            AvailabilityPublic = s.AvailabilityPublic,
            ProvidersCanEditOwnAvailability = s.ProvidersCanEditOwnAvailability,

            // Timezone / locale
            TimeZoneId = s.TimeZoneId,
            Locale = s.Locale,

            // Notifications
            EmailEnabled = s.EmailEnabled,
            SmsEnabled = s.SmsEnabled,
            SendBookingConfirmation = s.SendBookingConfirmation,
            ReminderHoursBefore = s.ReminderHoursBefore
        };

        private static bool EnumTryParse<T>(string value, out T parsed) where T : struct, Enum
            => Enum.TryParse<T>(value, ignoreCase: true, out parsed);

        private static int Clamp(int v, int min, int max) => v < min ? min : (v > max ? max : v);
    }
}
